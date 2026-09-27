// Official, publicly readable source links only. No third-party PDF is copied into this site.
const groups = [
  {id:'basics',title:'数制与压缩',items:[
    {title:'Digital Arithmetic · Chapter 1: Introduction',by:'Ercegovac / Lang · UCLA 讲义 · 27 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch1.pdf',summary:'位权、数制与冗余表示。',toc:[['讲义与全书概览',1],['数值表示系统',8],['冗余数位集合',14]]},
    {title:'Digital Arithmetic · Chapter 2: Two-Operand Addition',by:'Ercegovac / Lang · UCLA 讲义 · 57 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch2.pdf',summary:'两操作数加法及进位网络。',toc:[['两操作数加法',1],['先行进位',20],['前缀加法器',26]]},
    {title:'Digital Arithmetic · Chapter 3: Multioperand Addition',by:'Ercegovac / Lang · UCLA 讲义 · 36 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch3.pdf',summary:'多操作数压缩、carry-save 加法树。',toc:[['多操作数加法',1],['归约结构',14],['Carry-save 加法树',16]]}
  ]},
  {id:'arithmetic',title:'乘法与除法',items:[
    {title:'Digital Arithmetic · Chapter 4: Multiplication',by:'Ercegovac / Lang · UCLA 讲义 · 54 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch4.pdf',summary:'部分积生成、重编码与乘法器归约。',toc:[['乘法概览',1],['乘数重编码',25]]},
    {title:'Digital Arithmetic · Chapter 5: Division by Digit Recurrence',by:'Ercegovac / Lang · UCLA 讲义 · 76 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch5.pdf',summary:'逐位递推、冗余商位与 SRT 除法。',toc:[['逐位递推除法',1],['Radix-2 SRT',49]]},
    {title:'Digital Arithmetic · Chapter 7: Iterative Methods',by:'Ercegovac / Lang · UCLA 讲义 · 20 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch7.pdf',summary:'倒数近似与迭代除法。',toc:[['迭代方法',1],['Newton 倒数迭代',2]]},
    {title:'Modern Computer Arithmetic · 作者公开书稿',by:'Brent / Zimmermann · arXiv · 263 页',url:'https://arxiv.org/pdf/1004.4710',summary:'任意精度整数及浮点算法；是书稿，不是硬件设计教材。',toc:[['目录与概览',1],['浮点算术',100]]}
  ]},
  {id:'floating',title:'浮点与 PPA',items:[
    {title:'Digital Arithmetic · Chapter 8: Floating-point Arithmetic',by:'Ercegovac / Lang · UCLA 讲义 · 74 页',url:'https://web.cs.ucla.edu/digital_arithmetic/files/ch8.pdf',summary:'格式、浮点加乘法、guard bits 和舍入。',toc:[['浮点运算概览',1],['浮点加减',25],['Guard bits 与舍入',32],['浮点乘法实现',48]]},
    {title:'FPnew · 作者预印本',by:'Mach 等 · arXiv · 14 页',url:'https://arxiv.org/pdf/2007.01530',summary:'多格式 FPU 的架构与能效研究。',toc:[['论文摘要与背景',1],['架构背景',2]]},
    {title:'Designing Custom Arithmetic Data Paths with FloPoCo · 作者公开稿',by:'de Dinechin / Pasca · 作者主页 · 6 页',url:'https://perso.citi-lab.fr/fdedinec/recherche/publis/2011-DaT-FloPoCo.pdf',summary:'参数化算术核与流水线生成的分工。',toc:[['论文概览',1],['流水线动机',2]]}
  ]}
];

const list = document.getElementById('official-list');
for (const group of groups) {
  const section = document.createElement('section');
  section.className = 'official-group'; section.id = group.id;
  const head = document.createElement('div'); head.className = 'official-group-header';
  const title = document.createElement('h2'); title.textContent = group.title;
  const count = document.createElement('span'); count.textContent = `${group.items.length} 份 · 官方 PDF`;
  head.append(title,count);
  const grid = document.createElement('div'); grid.className = 'official-grid';
  for (const item of group.items) {
    const card = document.createElement('article'); card.className = 'official-card';
    const meta = document.createElement('p'); meta.className = 'official-meta'; meta.textContent = item.by;
    const heading = document.createElement('h3'); heading.textContent = item.title;
    const description = document.createElement('p'); description.textContent = item.summary;
    const source = document.createElement('a'); source.className = 'official-source';
    source.href = item.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = '在源站打开 PDF ↗';
    const toc = document.createElement('div'); toc.className = 'official-toc';
    const label = document.createElement('strong'); label.textContent = '按 PDF 实际页码跳转'; toc.append(label);
    for (const [name,page] of item.toc) {
      const link = document.createElement('a'); link.href = `${item.url}#page=${page}`;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      const text = document.createElement('span'); text.textContent = name;
      const number = document.createElement('small'); number.textContent = `第 ${page} 页`;
      link.append(text,number); toc.append(link);
    }
    card.append(meta,heading,description,source,toc); grid.append(card);
  }
  section.append(head,grid); list.append(section);
}
