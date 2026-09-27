// This is a catalogue of user-owned files, not a collection of publicly hosted PDFs.
// Page numbers are physical PDF page indices (1-based), not printed page labels.
export const pdfGroups = [
  { id:'multiplication', title:'乘法与冗余表示', description:'压缩树、Booth 编码、部分积结构与进位保存表示。' },
  { id:'floating', title:'浮点规范', description:'格式、运算、舍入与异常的规范依据。' },
  { id:'implementation', title:'架构、工具与器件', description:'流水线设计、时序分析与 FPGA DSP 原语。' }
];

export const pdfCatalog = [
  {
    id:'dadda-1965', group:'multiplication', title:'Some Schemes for Parallel Multipliers',
    author:'Luigi Dadda', year:'1965', kind:'论文 · 扫描件', pages:8,
    filename:'Dadda_mult.pdf', outline:'curated',
    summary:'经典 Dadda 乘法器论文；这份扫描件没有可提取的正文或 PDF 书签。',
    sourceUrl:'https://ieeemilestones.ethw.org/File:Some_schemes_for_parallel_multipliers_(reprint).pdf', sourceLabel:'IEEE Milestones 书目信息与重印本',
    toc:[['引言与并行计数器方案',1],['受限输入数的计数器与压缩级数',2],['压缩调度实例',4],['并行计数器实现',6],['结论',8]]
  },
  {
    id:'huang-2003', group:'multiplication', title:'High-Level Optimization Techniques for Low-Power Multiplier Design',
    author:'Zhijun Huang', year:'2003', kind:'博士论文', pages:220,
    filename:'High-Level Optimization Techniques.pdf', outline:'curated',
    summary:'围绕乘法重编码、操作数表示、部分积归约和信号门控的低功耗优化。',
    sourceUrl:'https://web.cs.ucla.edu/~milos/students.htm', sourceLabel:'UCLA 导师学生与论文目录',
    note:'纸面页码与 PDF 页码相差 21 页；下列目录均按 PDF 实际页码定位。',
    toc:[['目录',5],['1 引言',22],['2 乘法重编码优化',34],['2.2 Radix-4 重编码',37],['3 操作数表示优化',68],['4 阵列乘法器归约结构',86],['5 高性能低功耗乘法器',117],['6 线性阵列信号门控',143],['7 高性能乘法器信号门控',175],['8 结论与未来工作',191],['附录：实验方法',200],['参考文献',209]]
  },
  {
    id:'booth-regular', group:'multiplication', title:'Modified Booth Multipliers With a Regular Partial Product Array',
    author:'Shiann-Rong Kuang · Jiun-Ping Wang · Cang-Yuan Guo', year:'2009', kind:'论文', pages:5,
    filename:'Modified_Booth_Multipliers_With_a_Regular_Partial_Product_Array.pdf', outline:'curated',
    summary:'规整 modified Booth 部分积阵列，讨论部分积行数及面积、延迟、功耗。',
    sourceUrl:'https://ieeexplore.ieee.org/document/4912330/', sourceLabel:'IEEE Xplore 出版方页面',
    toc:[['I 引言',1],['II 常规 MBE 乘法器',2],['III 提出的乘法器结构',2],['IV 实验结果',4],['V 结论',5]]
  },
  {
    id:'carry-save-shift', group:'multiplication', title:'Carry-Save Representation Is Shift-Unsafe: The Problem and Its Solution',
    author:'Alexandre F. Tenca · Song Park · Lo’ai A. Tawalbeh', year:'2006', kind:'论文', pages:6,
    filename:'Carry-save_representation_is_shift-unsafe_the_problem_and_its_solution (1).pdf', outline:'curated',
    summary:'解释为什么对进位保存表示直接算术右移或符号扩展可能出错。',
    sourceUrl:'https://ieeexplore.ieee.org/document/1613842/', sourceLabel:'IEEE Xplore 出版方页面',
    toc:[['1 引言、2 记号、3 问题定义',1],['4 CS 数字表示与 5 进位链',2],['6 问题分析',3],['7 最高位数字生成电路',5],['8 结论',6]]
  },
  {
    id:'ieee-754', group:'floating', title:'IEEE Standard for Floating-Point Arithmetic (IEEE 754-2019)',
    author:'IEEE Computer Society', year:'2019', kind:'标准', pages:84,
    filename:'IEEE Standard 754-2019.pdf', outline:'embedded',
    summary:'浮点格式、舍入、运算和异常的规范；该文件已自带 PDF 书签。',
    sourceUrl:'https://standards.ieee.org/ieee/754/6210/', sourceLabel:'IEEE Standards Association',
    toc:[['1 概述',12],['2 定义',14],['3 浮点格式',17],['4 属性与舍入',27],['5 运算',30],['6 无穷、NaN 与符号位',49],['7 异常',52],['8 替代异常处理',56],['9 推荐运算',59],['10 表达式求值',73],['11 可复现结果',76]]
  },
  {
    id:'hardware-architecture', group:'implementation', title:'The Art of Hardware Architecture',
    author:'Mohit Arora', year:'2011', kind:'教材', pages:238,
    filename:'The+Art+of+Hardware+Architecture_+Design+Methods+and+Techniques+for+Digital+Circuits-Springer+(2011).pdf', outline:'embedded',
    summary:'数字电路设计方法，重点可读亚稳态、时钟与复位、低功耗与流水线章节。',
    sourceUrl:'https://link.springer.com/book/10.1007/978-1-4614-0397-5', sourceLabel:'Springer 出版方页面',
    toc:[['1 亚稳态',18],['2 时钟与复位',28],['3 多时钟处理',68],['4 时钟分频',104],['5 低功耗设计',112],['6 流水线',146],['7 字节序',172],['8 去抖',186],['9 EMC 设计准则',200]]
  },
  {
    id:'primetime-2019', group:'implementation', title:'PrimeTime User Guide (P-2019.03-SP4)',
    author:'Synopsys', year:'2019', kind:'工具手册 · 专有', pages:1145,
    filename:'PrimeTime 2019 User Guide.pdf', outline:'embedded',
    summary:'静态时序分析与约束、时钟、路径例外、PBA 等；文件明确受许可限制。',
    sourceUrl:'https://www.synopsys.com/support/licensing-installation-computeplatforms/synopsys-documentation.html', sourceLabel:'Synopsys 文档入口（需授权）',
    toc:[['1 PrimeTime 简介',35],['5 设计约束',133],['6 时钟',163],['7 时序路径与例外',223],['9 延迟计算',289],['11 Case / Mode Analysis',362],['15 高级分析',544],['17 报告与调试',725]]
  },
  {
    id:'ug579', group:'implementation', title:'UltraScale Architecture DSP Slice User Guide (UG579)',
    author:'Xilinx / AMD', year:'v1.7 · 2018', kind:'器件手册', pages:75,
    filename:'ug579-ultrascale-dsp (1).pdf', outline:'embedded',
    summary:'DSP48E2 原语的数据通路、工作模式、寄存器与级联。当前 AMD 在线文档可能是更新版本。',
    sourceUrl:'https://docs.amd.com/v/u/en-US/ug579-ultrascale-dsp', sourceLabel:'AMD 官方文档入口',
    toc:[['1 概览',6],['2 DSP48E2 功能',13],['3 DSP48E2 设计入口',48],['4 使用指南',58],['5 级联',67]]
  }
];
