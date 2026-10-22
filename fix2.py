p='src/modules/remocao/components/TabelaBusca.tsx'
s=open(p).read()
s=s.replace("export function Cid10Select({ value, onChange }: { value: string, onChange: (v: any) => void })",
            "export function Cid10Select({ value: _value, onChange }: { value: string, onChange: (v: any) => void })")
s=s.replace("export function SigtapSelect({ value, onChange }: { value: string, onChange: (v: any) => void })",
            "export function SigtapSelect({ value: _value, onChange }: { value: string, onChange: (v: any) => void })")
s=s.replace("export function CboSelect({ value, onChange }: { value: string, onChange: (v: any) => void })",
            "export function CboSelect({ value: _value, onChange }: { value: string, onChange: (v: any) => void })")
open(p,'w').write(s)
print('done')
