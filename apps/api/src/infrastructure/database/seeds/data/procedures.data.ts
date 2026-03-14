export const PROCEDURES_BY_CLINIC: Record<string, Array<{
  name: string
  description: string
  category: string
  defaultDuration: number
}>> = {
  bellavita_sp: [
    { name: 'Toxina Botulínica (Botox)', description: 'Aplicação de toxina botulínica para suavização de rugas dinâmicas', category: 'Estética Facial', defaultDuration: 30 },
    { name: 'Preenchimento Facial com Ácido Hialurônico', description: 'Preenchimento de sulcos e contorno facial', category: 'Estética Facial', defaultDuration: 45 },
    { name: 'Peeling Químico', description: 'Renovação celular com ácidos para tratamento de manchas e textura', category: 'Tratamento de Pele', defaultDuration: 60 },
    { name: 'Limpeza de Pele Profunda', description: 'Higienização e extração com hidratação especializada', category: 'Tratamento de Pele', defaultDuration: 90 },
    { name: 'Bioestimulador de Colágeno', description: 'Estimulação da produção de colágeno para rejuvenescimento', category: 'Estética Facial', defaultDuration: 45 },
    { name: 'Microagulhamento', description: 'Indução de colágeno com microagulhas para cicatrizes e rejuvenescimento', category: 'Tratamento de Pele', defaultDuration: 60 },
    { name: 'Laser CO2 Fracionado', description: 'Tratamento a laser para rejuvenescimento e manchas', category: 'Laser', defaultDuration: 90 },
    { name: 'Consulta Avaliação', description: 'Avaliação estética e planejamento de tratamento', category: 'Consulta', defaultDuration: 30 },
    { name: 'Retorno', description: 'Consulta de acompanhamento pós-procedimento', category: 'Consulta', defaultDuration: 20 },
    { name: 'Fio de PDO', description: 'Lifting não cirúrgico com fios de PDO', category: 'Estética Facial', defaultDuration: 60 },
  ],
  bellavita_rj: [
    { name: 'Toxina Botulínica (Botox)', description: 'Aplicação de toxina botulínica para suavização de rugas dinâmicas', category: 'Estética Facial', defaultDuration: 30 },
    { name: 'Preenchimento Labial', description: 'Preenchimento e definição labial com ácido hialurônico', category: 'Estética Facial', defaultDuration: 30 },
    { name: 'Limpeza de Pele Profunda', description: 'Higienização e extração com hidratação especializada', category: 'Tratamento de Pele', defaultDuration: 90 },
    { name: 'Skinbooster', description: 'Hidratação profunda com microinjeções de ácido hialurônico', category: 'Tratamento de Pele', defaultDuration: 45 },
    { name: 'Luz Intensa Pulsada (LIP)', description: 'Fotorejuvenescimento para manchas e vasinhos', category: 'Laser', defaultDuration: 60 },
    { name: 'Consulta Avaliação', description: 'Avaliação estética e planejamento de tratamento', category: 'Consulta', defaultDuration: 30 },
    { name: 'Retorno', description: 'Consulta de acompanhamento pós-procedimento', category: 'Consulta', defaultDuration: 20 },
    { name: 'Harmonização Facial Completa', description: 'Conjunto de procedimentos para equilíbrio facial', category: 'Estética Facial', defaultDuration: 120 },
    { name: 'Drenagem Linfática Facial', description: 'Massagem drenante para redução de inchaços e toxinas', category: 'Tratamento de Pele', defaultDuration: 60 },
    { name: 'Microagulhamento', description: 'Indução de colágeno com microagulhas', category: 'Tratamento de Pele', defaultDuration: 60 },
  ],
  smileplus: [
    { name: 'Limpeza Dental (Profilaxia)', description: 'Remoção de tártaro e placa bacteriana com polimento', category: 'Prevenção', defaultDuration: 45 },
    { name: 'Restauração Resina Composta', description: 'Restauração estética com resina composta', category: 'Restauradora', defaultDuration: 45 },
    { name: 'Tratamento de Canal (Endodontia)', description: 'Tratamento de canal radicular', category: 'Endodontia', defaultDuration: 90 },
    { name: 'Clareamento Dental a Laser', description: 'Clareamento dental com gel e luz de LED/laser', category: 'Estética', defaultDuration: 90 },
    { name: 'Aparelho Ortodôntico Fixo', description: 'Instalação de aparelho ortodôntico metálico ou estético', category: 'Ortodontia', defaultDuration: 90 },
    { name: 'Alinhadores Invisíveis', description: 'Tratamento ortodôntico com alinhadores transparentes', category: 'Ortodontia', defaultDuration: 60 },
    { name: 'Extração Simples', description: 'Extração dentária simples', category: 'Cirurgia', defaultDuration: 30 },
    { name: 'Extração de Siso', description: 'Extração cirúrgica de dente do siso', category: 'Cirurgia', defaultDuration: 60 },
    { name: 'Implante Dentário', description: 'Colocação de implante osseointegrado', category: 'Implantodontia', defaultDuration: 120 },
    { name: 'Consulta Avaliação', description: 'Avaliação odontológica completa e radiografias', category: 'Consulta', defaultDuration: 30 },
    { name: 'Retorno Ortodôntico', description: 'Consulta de acompanhamento ortodôntico', category: 'Ortodontia', defaultDuration: 30 },
    { name: 'Facetas de Porcelana', description: 'Laminados de porcelana para estética dental', category: 'Estética', defaultDuration: 120 },
  ],
}
