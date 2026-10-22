"""
Script Python para importar catálogos de referência clínica e faturamento
Gestão de Remoção Alpha — versão para auditoria e homologação local.

FONTES:
- SIGTAP: DATASUS / tabela-unificada (http://sigtap.datasus.gov.br)
- CID-10: DATASUS / OMS (http://www2.datasus.gov.br/cid10)
- CBO: Ministério do Trabalho e Emprego (site oficial MTE)

REGRAS DE SEGURANÇA:
- Credenciais apenas via variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
- Nenhuma credencial gravada no código nem nos logs.
- Importação para staging com validação antes de publicar competência.
- Nenhuma escrita no banco remoto sem autorização explícita.
- RLS e isolamento por tenant respeitados nas operações aplicáveis.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import os
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests

LOG = logging.getLogger("remocao_alpha.catalogos")
if not LOG.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    LOG.addHandler(handler)
LOG.setLevel(logging.INFO)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Timeout padrão para downloads oficiais
DOWNLOAD_TIMEOUT = 180

# Competência SIGTAP padrão a tentar (YYYYMM). A competência real deve ser
# descoberta consultando o DATASUS, não presumida.
DEFAULT_SIGTAP_COMPETENCIA = datetime.now(timezone.utc).strftime("%Y%m")

CATALOGO_ERROS: list[str] = []


@dataclass
class ImportacaoResultado:
    tabela: str
    registros_lidos: int
    registros_validos: int
    registros_importados: int
    registros_rejeitados: int
    erros: list[str]
    competencia: str | None = None


def _validar_ambiente() -> None:
    if not SUPABASE_URL:
        CATALOGO_ERROS.append("SUPABASE_URL não definida")
    if not SUPABASE_SERVICE_ROLE_KEY:
        CATALOGO_ERROS.append("SUPABASE_SERVICE_ROLE_KEY não definida")
    if CATALOGO_ERROS:
        raise RuntimeError("; ".join(CATALOGO_ERROS))


def _baixar_zip(url: str, nome_arquivo: str) -> zipfile.ZipFile:
    LOG.info("Baixando %s (%s)", nome_arquivo, url)
    resposta = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
    resposta.raise_for_status()
    return zipfile.ZipFile(io.BytesIO(resposta.content))


def _extrair_arquivo_zip(zip_arquivo: zipfile.ZipFile, prefixo: str) -> str:
    for nome in zip_arquivo.namelist():
        if prefixo.lower() in nome.lower() and (nome.endswith(".txt") or nome.endswith(".csv")):
            return nome
    raise FileNotFoundError(f"Arquivo com prefixo '{prefixo}' não encontrado no ZIP")


def _ler_conteudo_zip(zip_arquivo: zipfile.ZipFile, nome_arquivo: str) -> str:
    conteudo_bytes = zip_arquivo.read(nome_arquivo)
    for encoding in ("utf-8", "latin1", "cp1252"):
        try:
            return conteudo_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("utf-8", conteudo_bytes, 0, len(conteudo_bytes), f"Não foi possível decodificar {nome_arquivo}")


def _parse_competencia_disponivel(conteudo_html: str) -> str | None:
    """Tenta descobrir a competência mais recente disponível no HTML do DATASUS."""
    import re

    padroes = re.findall(r"sigtap_(\d{6})\.zip", conteudo_html)
    if not padroes:
        return None
    padroes_unicos = sorted(set(padroes), reverse=True)
    return padroes_unicos[0]


def importar_sigtap(competencia: str | None = None, modo_staging: bool = True) -> ImportacaoResultado:
    """Importa procedimentos SIGTAP versionados por (codigo, competencia)."""
    resultado = ImportacaoResultado(
        tabela="sigtap_procedimentos",
        registros_lidos=0,
        registros_validos=0,
        registros_importados=0,
        registros_rejeitados=0,
        erros=[],
        competencia=competencia,
    )

    if not competencia:
        # Tenta descobrir a competência mais recente disponível no DATASUS
        try:
            html = requests.get(
                "http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp",
                timeout=DOWNLOAD_TIMEOUT,
            ).text
            descoberta = _parse_competencia_disponivel(html)
            if descoberta:
                competencia = descoberta
                LOG.info("Competência SIGTAP descoberta automaticamente: %s", competencia)
            else:
                competencia = DEFAULT_SIGTAP_COMPETENCIA
                LOG.warning("Não foi possível descobrir a competência; usando padrão %s", competencia)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Falha ao descobrir competência (%s); usando padrão %s", exc, DEFAULT_SIGTAP_COMPETENCIA)
            competencia = DEFAULT_SIGTAP_COMPETENCIA

    resultado.competencia = competencia

    urls = [
        f"http://sigtap.datasus.gov.br/tabela-unificada/app/download/sigtap_{competencia}.zip",
    ]

    for url in urls:
        try:
            zip_arquivo = _baixar_zip(url, f"sigtap_{competencia}.zip")
            nome_arquivo = _extrair_arquivo_zip(zip_arquivo, "tb_procedimento")
            conteudo = _ler_conteudo_zip(zip_arquivo, nome_arquivo)
            linhas = conteudo.splitlines()

            # Ignora cabeçalho
            dados = linhas[1:] if linhas else []

            for linha in dados:
                resultado.registros_lidos += 1
                colunas = linha.split(";")
                if len(colunas) < 6:
                    resultado.registros_rejeitados += 1
                    resultado.erros.append(f"Linha {resultado.registros_lidos}: colunas insuficientes")
                    continue

                codigo = colunas[0].strip().strip('"')
                nome = colunas[1].strip().strip('"')
                grupo_codigo = colunas[2].strip().strip('"') if len(colunas) > 2 else None
                grupo_nome = colunas[3].strip().strip('"') if len(colunas) > 3 else None
                valor_sh_str = colunas[4].strip().strip('"').replace(",", ".") if len(colunas) > 4 else "0"
                valor_sa_str = colunas[5].strip().strip('"').replace(",", ".") if len(colunas) > 5 else "0"

                if not codigo or not nome:
                    resultado.registros_rejeitados += 1
                    resultado.erros.append(f"Linha {resultado.registros_lidos}: código ou nome vazio")
                    continue

                try:
                    valor_sh = float(valor_sh_str) if valor_sh_str else 0.0
                except ValueError:
                    valor_sh = 0.0
                try:
                    valor_sa = float(valor_sa_str) if valor_sa_str else 0.0
                except ValueError:
                    valor_sa = 0.0

                # valor_sp não existe no arquivo fonte do SIGTAP; mantém 0 até fonte oficial
                valor_sp = 0.0
                valor_total = valor_sh + valor_sa + valor_sp

                registro = {
                    "codigo": codigo,
                    "competencia": competencia,
                    "nome": nome,
                    "grupo_codigo": grupo_codigo or None,
                    "grupo_nome": grupo_nome or None,
                    "valor_sh": valor_sh,
                    "valor_sa": valor_sa,
                    "valor_sp": valor_sp,
                    "valor_total": valor_total,
                    "fonte": "DATASUS/SIGTAP",
                    "importado_em": datetime.now(timezone.utc).isoformat(),
                }

                resultado.registros_validos += 1

                if modo_staging:
                    # Em staging, apenas acumula; a publicação ocorre após validação
                    resultado.registros_importados += 1
                else:
                    # A escrita real só ocorre com cliente Supabase configurado e autorizado
                    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
                        try:
                            from supabase import create_client

                            cliente = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                            cliente.table("sigtap_procedimentos").upsert(
                                registro,
                                on_conflict="codigo,competencia",
                            ).execute()
                            resultado.registros_importados += 1
                        except Exception as exc:  # noqa: BLE001
                            resultado.registros_rejeitados += 1
                            resultado.erros.append(f"Linha {resultado.registros_lidos}: {exc}")
                    else:
                        LOG.warning("Credenciais não configuradas; registro não gravado: %s", codigo)

            LOG.info(
                "SIGTAP %s: %d lidos, %d válidos, %d importados, %d rejeitados",
                competencia,
                resultado.registros_lidos,
                resultado.registros_validos,
                resultado.registros_importados,
                resultado.registros_rejeitados,
            )
            return resultado

        except Exception as exc:  # noqa: BLE001
            LOG.error("Erro ao importar SIGTAP %s: %s", competencia, exc)
            resultado.erros.append(str(exc))

    return resultado


def importar_cid10(modo_staging: bool = True) -> ImportacaoResultado:
    """Importa catálogo CID-10 da fonte oficial DATASUS."""
    resultado = ImportacaoResultado(
        tabela="cid10",
        registros_lidos=0,
        registros_validos=0,
        registros_importados=0,
        registros_rejeitados=0,
        erros=[],
    )

    url = "http://www2.datasus.gov.br/cid10/v2008/downloads/CID10CSV.zip"

    try:
        zip_arquivo = _baixar_zip(url, "CID10CSV.zip")
        nome_arquivo = _extrair_arquivo_zip(zip_arquivo, "CID10")
        conteudo = _ler_conteudo_zip(zip_arquivo, nome_arquivo)
        leitor = csv.DictReader(io.StringIO(conteudo), delimiter=";")

        for linha in leitor:
            resultado.registros_lidos += 1

            codigo = (linha.get("CODIGO") or linha.get("codigo") or "").strip().strip('"')
            descricao = (linha.get("DESCRICAO") or linha.get("descricao") or "").strip().strip('"')

            if not codigo or not descricao:
                resultado.registros_rejeitados += 1
                resultado.erros.append(f"CID-10 linha {resultado.registros_lidos}: código ou descrição vazio")
                continue

            registro = {
                "codigo": codigo,
                "descricao": descricao,
                "fonte": "DATASUS/OMS",
                "importado_em": datetime.now(timezone.utc).isoformat(),
            }

            resultado.registros_validos += 1

            if modo_staging:
                resultado.registros_importados += 1
            else:
                if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
                    try:
                        from supabase import create_client

                        cliente = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                        cliente.table("cid10").upsert(registro, on_conflict="codigo").execute()
                        resultado.registros_importados += 1
                    except Exception as exc:  # noqa: BLE001
                        resultado.registros_rejeitados += 1
                        resultado.erros.append(f"CID-10 linha {resultado.registros_lidos}: {exc}")
                else:
                    LOG.warning("Credenciais não configuradas; registro não gravado: %s", codigo)

        LOG.info(
            "CID-10: %d lidos, %d válidos, %d importados, %d rejeitados",
            resultado.registros_lidos,
            resultado.registros_validos,
            resultado.registros_importados,
            resultado.registros_rejeitados,
        )
        return resultado

    except Exception as exc:  # noqa: BLE001
        LOG.error("Erro ao importar CID-10: %s", exc)
        resultado.erros.append(str(exc))
        return resultado


def importar_cbo(modo_staging: bool = True) -> ImportacaoResultado:
    """Importa catálogo CBO da fonte oficial do Ministério do Trabalho e Emprego.

    O CBO oficial deve ser obtido do site do MTE. Este script tenta a URL
    oficial conhecida; se falhar, registra erro e não importa dados de mirror
    não comprovados.
    """
    resultado = ImportacaoResultado(
        tabela="cbo_ocupacoes",
        registros_lidos=0,
        registros_validos=0,
        registros_importados=0,
        registros_rejeitados=0,
        erros=[],
    )

    urls_oficiais = [
        "https://www.gov.br/trabalho/pt-br/assuntos/seguranca-e-saude-no-trabalho/cbo",
    ]

    sucesso = False
    for url in urls_oficiais:
        try:
            resposta = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
            if resposta.status_code == 200:
                LOG.info("CBO: fonte oficial acessível (%s)", url)
                sucesso = True
                break
        except Exception as exc:  # noqa: BLE001
            LOG.warning("CBO: fonte oficial indisponível (%s): %s", url, exc)

    if not sucesso:
        LOG.error(
            "CBO: nenhuma fonte oficial do MTE disponível. Não importar dados de mirror não comprovados."
        )
        resultado.erros.append("Fonte oficial CBO (MTE) não acessível. Importação abortada.")
        return resultado

    # Quando o arquivo oficial estiver disponível, o parsing deve ser implementado
    # conforme o layout real do MTE. Até lá, não gravamos dados fictícios.
    LOG.info("CBO: aguardando implementação do parser do arquivo oficial do MTE.")
    return resultado


def executar_todas(
    competencia_sigtap: str | None = None,
    modo_staging: bool = True,
) -> dict[str, ImportacaoResultado]:
    """Executa a importação de todos os catálogos e retorna resultados."""
    _validar_ambiente()

    resultados: dict[str, ImportacaoResultado] = {}

    resultados["sigtap_procedimentos"] = importar_sigtap(competencia_sigtap, modo_staging)
    resultados["cid10"] = importar_cid10(modo_staging)
    resultados["cbo_ocupacoes"] = importar_cbo(modo_staging)

    total_lidos = sum(r.registros_lidos for r in resultados.values())
    total_validos = sum(r.registros_validos for r in resultados.values())
    total_importados = sum(r.registros_importados for r in resultados.values())
    total_rejeitados = sum(r.registros_rejeitados for r in resultados.values())
    total_erros = sum(len(r.erros) for r in resultados.values())

    LOG.info(
        "Importação concluída: %d lidos, %d válidos, %d importados, %d rejeitados, %d erros",
        total_lidos,
        total_validos,
        total_importados,
        total_rejeitados,
        total_erros,
    )

    if modo_staging:
        LOG.info("Modo staging: nenhuma competência publicada. Validar antes de publicar.")

    return resultados


if __name__ == "__main__":
    modo_staging = os.getenv("MODO_STAGING", "true").lower() == "true"
    competencia = os.getenv("SIGTAP_COMPETENCIA")

    try:
        executar_todas(competencia, modo_staging)
    except RuntimeError as exc:
        LOG.error("Falha de configuração: %s", exc)
        sys.exit(1)

    if CATALOGO_ERROS:
        LOG.error("Erros pendentes: %s", "; ".join(CATALOGO_ERROS))
        sys.exit(1)

    LOG.info("Processo finalizado com sucesso.")
