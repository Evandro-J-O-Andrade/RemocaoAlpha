-- Conceder permissao remocao.remocao.update_status ao role motorista
-- Necessario para que o motorista possa transicionar status de remocao via RPC update_remocao_status
-- Idempotente: ON CONFLICT DO NOTHING
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.key = 'motorista'
  AND p.key = 'remocao.remocao.update_status'
ON CONFLICT (role_id, permission_id) DO NOTHING;
