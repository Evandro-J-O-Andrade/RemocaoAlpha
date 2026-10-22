p='src/modules/remocao/pages/CentralRemocoesPage.tsx'
s=open(p,encoding='utf-8').read()
repls = {
'Ã§Ã£o':'caoX','Ã¢':'a','Ã©':'e','Ã­':'i','Ã³':'o','Ãº':'u','Ã£':'a','Ãµ':'o',
}
for a,b in repls.items():
    s=s.replace(a,b)
open(p,'w',encoding='utf-8').write(s)
print('done')
