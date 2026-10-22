import re
p='src/modules/remocao/components/TabelaBusca.tsx'
s=open(p).read()
# Make value optional in type and destructure with underscore alias
s=s.replace("{ value: string, onChange: (v: any) => void }", "{ value?: string, onChange: (v: any) => void }")
s=s.replace("Cid10Select({ value, onChange }", "Cid10Select({ value: _value, onChange }")
s=s.replace("SigtapSelect({ value, onChange }", "SigtapSelect({ value: _value, onChange }")
s=s.replace("CboSelect({ value, onChange }", "CboSelect({ value: _value, onChange }")
# remove value= props in callers
s=s.replace("<Cid10Select value={cid} onChange={setCid} />", "<Cid10Select onChange={setCid} />")
s=s.replace("<SigtapSelect value={sigtap} onChange={setSigtap} />", "<SigtapSelect onChange={setSigtap} />")
open(p,'w').write(s)
print('done')
