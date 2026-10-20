/* Спільне для сайту (calculator.html) і адмінки (admin.html):
   дані каталогу, іконки, стан калькулятора, розрахунок ціни й розкладки.
   У робочій версії дані приходять з бази, а розрахунок стане модулем на сервері. */
/* =====================================================================
   ДАНІ. У робочій версії все це редагується в адмінці.
   Розміри матеріалів — у сантиметрах; стандартні розміри виробів — у мм.
   ===================================================================== */
const CFG = {
  markup:0.30,      // стандартна націнка на собівартість обрізку
  marginRoll:10,    // зазор під друк з кожного боку, рулон, см
  marginSheet:1,    // те саме для листових, см
  leftoverMin:30,   // смуга листа від цього розміру — діловий залишок, см
  level:'retail',
  levels:[{id:'retail',name:'Роздріб',d:0},{id:'regular',name:'Постійний',d:.05},{id:'partner',name:'Партнер',d:.10},{id:'agency',name:'Агенція',d:.15}],
  volume:[{q:1,d:0},{q:5,d:.019},{q:30,d:.028},{q:100,d:.04},{q:500,d:.06}],  // знижка від тиражу
  tirageList:[1,2,3,4,5,10,15,20,25,30,40,50,75,100,150,200,250,300,500,1000],
};

const Q = {
  q720:{n:'720 dpi',t:"СТАНДАРТ (екстер'єр)\nЗвичайна якість: сітілайт, вивіска"},
  q1440:{n:'1440 dpi',t:"ПРЕМІУМ (екстер'єр, інтер'єр)\nЗвичайна якість: плакат, наліпка"},
  photo:{n:'1440 Фото',t:"ФОТО друк (екстер'єр, інтер'єр)\nФотографічна якість відбитку"},
  uv:{n:'1440 УФ<br>CMYK',t:"УФ друк (екстер'єр, інтер'єр)\nСтійка до стирання, вицвітання"},
  uvgl:{n:'1440 УФ CMYK<br>+ ГЛ лак',t:'УФ друк + Глянцевий лак'},
  uvmat:{n:'1440 УФ CMYK<br>+ МАТ лак',t:'УФ друк + Матовий лак'},
  uvcw:{n:'1440 УФ CMYK<br>+ WHITE',t:'УФ друк в 2-а шари CMYK + WHITE'},
  uvw:{n:'1440 УФ<br>WHITE',t:'УФ друк WHITE'},
  uvwc:{n:'1440 УФ WHITE<br>+ CMYK',t:'УФ друк в 2-а шари WHITE + CMYK'},
  uvl:{n:'1440 УФ<br>Шарами',t:'УФ шарами'},
  w1:{n:'WHITE',t:'УФ друк WHITE'},
  w2:{n:'WHITE<br>2-а шари',t:'УФ друк WHITE у 2 шари'},
  none:{n:'Без<br>друку',t:'Відвантаження без друку з порізкою'},
};

const TERMS = {
  std:[{id:'h3',n:'Експрес',s:'3 години',hours:3,k:1.23},{id:'d1',n:'Стандарт',s:'1 день',days:1,k:1},{id:'d2',n:'Економ',s:'2 дні',days:2,k:.95},{id:'d3',n:'Супер економ',s:'3 дні',days:3,k:.90}],
  short:[{id:'d1',n:'Стандарт',s:'1 день',days:1,k:1},{id:'d2',n:'Економ',s:'2 дні',days:2,k:.95},{id:'d3',n:'Супер економ',s:'3 дні',days:3,k:.90}],
  long:[{id:'d3',n:'3 дні',s:'',days:3,k:1},{id:'d4',n:'4 дні',s:'',days:4,k:.95},{id:'d5',n:'5 днів',s:'',days:5,k:.90}],
};

/* ---------- опції ---------- */
// per: piece | perim (за м пог. периметра) | perimCm | area (м²) | pocket | perimTh (залежить від товщини)
const OPT = {
  bannerTwo:{id:'two',l:'Друк з двох сторін',t:'select',c:[{l:'Ні'},{l:'Книгою на спільні люверси',k:2}]},
  bannerCut:{id:'cut',l:'Порізка',t:'select',def:1,c:[
    {l:'Ні — відвантаження в рулоні'},
    {l:'Є — відвантаження в заданому розмірі',p:2,per:'perim',min:2},
    {l:'Фігурна проста — квадрат, круг, овал, сердце',p:6,per:'perim',min:20},
    {l:'Фігурна складна — зірка, фігура',p:10,per:'perim',min:30}]},
  eyel:{id:'eyel',l:'Люверсовка',t:'select',c:[
    {l:'Ні'},{l:'По периметру',pos:'trbl'},{l:'По міткам в макеті',pos:'trbl'},{l:'По кутам',pos:'c4'},
    {l:'По кутам та середині',pos:'c8'},{l:'Тільки зверху',pos:'t'},{l:'Тільки знизу',pos:'b'},
    {l:'Зверху та знизу',pos:'tb'},{l:'Зліва та справа',pos:'lr'}]},
  eyelType:{id:'eyelType',l:'Люверсовка',t:'select',sub:1,when:o=>o.eyel>0,c:[{l:'З підворотом країв'},{l:'Без підворота'},{l:'Без підворота з підкладкою під люверси'}]},
  eyelDia:{id:'eyelDia',l:'Діаметр люверсів',t:'select',sub:1,when:o=>o.eyel>0,c:[{l:'10 мм — стандарт',ep:2.4},{l:'12 мм',ep:3}]},
  eyelStep:{id:'eyelStep',l:'Крок між люверсами',t:'select',sub:1,def:4,when:o=>o.eyel>0&&o.eyel!==3&&o.eyel!==4,
    c:[100,150,200,250,300,350,400,450,500].map(v=>({l:v+' мм'+(v===300?' — стандарт':''),step:v/10}))},
  hem:{id:'hem',l:'Зпаювання підворота',t:'select',c:[{l:'Ні'},{l:'По периметру',p:12,per:'perim'}]},
  pocket:{id:'pocket',l:'Кишеня під трубу (100мм)',t:'select',c:[{l:'Ні'},
    ...[['Тільки зверху','t'],['Тільки знизу','b'],['Тільки зліва','l'],['Тільки справа','r'],['Зверху та знизу','tb'],['Зліва та справа','lr']].map(([l,s])=>({l,p:30,per:'pocket',sides:s}))]},
  backing:{id:'backing',l:'Підкладка',t:'select',c:[{l:'Ні'},{l:'Так',p:40,per:'area'}]},

  filmCut:{id:'cut',l:'Порізка в розмір',t:'chips',c:[{l:'Ні'},{l:'Прямокутна',p:3,per:'perim',min:5},{l:'Фігурна проста — квадрат, круг, овал',p:8,per:'perim',min:15},{l:'Фігурна складна — зірка, фігура',p:14,per:'perim',min:25}]},
  plot:{id:'plot',l:'Плотерна порізка',t:'chips',c:[{l:'Ні'},{l:'Так'}]},
  plotLen:{id:'plotLen',l:'Довжина лінії різання',t:'plotlen',sub:1,when:o=>o.plot===1},
  plotCx:{id:'plotCx',l:'Складність порізки',t:'chips',sub:1,when:o=>o.plot===1,c:[{l:'Проста',pm:6},{l:'Складна',pm:10}]},
  pick:{id:'pick',l:'Вибірка зайвої плівки',t:'chips',sub:1,when:o=>o.plot===1,c:[{l:'Ні'},{l:'Так',p:60,per:'area'}]},
  mount:{id:'mount',l:'Монтажна плівка',t:'chips',sub:1,when:o=>o.plot===1,note:'Розрахунок вартості: min 0,3 пог. м, крок 0,1 пог. м',
    c:[{l:'Ні'},{l:'З прикатуванням',p:55,per:'area'},{l:'Віддати окремо',p:45,per:'area'}]},
  paperCut:{id:'cut',l:'Порізка в розмір',t:'chips',c:[{l:'Ні'},{l:'Прямокутна',p:2,per:'perim',min:5},{l:'Фігурна проста — квадрат, круг, овал',p:8,per:'perim',min:15},{l:'Фігурна складна — зірка, фігура',p:14,per:'perim',min:25},{l:'Трафарет',p:20,per:'perim',min:30}]},

  sheetTwo:{id:'two',l:'Друк з 2-х боків',t:'select',c:[{l:'Ні'},{l:'Є',k:1.9}]},
  pvhCut:{id:'cut',l:'Порізка',t:'select',c:[{l:'Є — відвантаження в заданому розмірі',per:'perimTh',min:11},{l:'Фігурна проста — квадрат, коло, овал, серце',per:'perimTh',x:2.5,min:11},{l:'Фігурна складна — зірка, стерн, фігура',per:'perimTh',x:4,min:11},{l:'Трафарет',per:'perimTh',x:5,min:11}]},
  foamCut:{id:'cut',l:'Порізка',t:'select',c:[{l:'Є — відвантаження в заданому розмірі',p:13.2,per:'piece',min:11},{l:'Фігурна проста — квадрат, коло, овал, серце',p:26,per:'piece',min:11},{l:'Трафарет',p:40,per:'piece',min:11}]},
  compCut:{id:'cut',l:'Порізка',t:'select',c:[{l:'Є — відвантаження в заданому розмірі',p:14.3,per:'piece',min:11},{l:'Фігурна проста — квадрат, коло, овал, серце',p:30,per:'piece',min:11},{l:'Фігурна складна — зірка, стерн, фігура',p:45,per:'piece',min:11},{l:'Трафарет',p:55,per:'piece',min:11}]},
  acrCut:{id:'cut',l:'Порізка',t:'select',c:[{l:'Є — відвантаження в заданому розмірі',p:7.2,per:'piece',min:12},{l:'Фігурна проста — квадрат, коло, овал, серце',p:18,per:'piece',min:12},{l:'Фігурна складна — зірка, стерн, фігура',p:30,per:'piece',min:12},{l:'Трафарет',p:40,per:'piece',min:12}]},
  hole:{id:'hole',l:'Отвір',t:'select',c:[{l:'Ні'},{l:'Ø 4 мм'},{l:'Ø 6 мм'},{l:'Ø 8 мм'},{l:'Ø 10 мм'}]},
  holePos:{id:'holePos',l:'Розташування отворів',t:'select',sub:1,when:o=>o.hole>0,c:[
    {l:'Зверху — по кутам',holes:2},{l:'Зверху — по кутам та середині',holes:3},{l:'По міткам в макеті',holes:4},{l:'По периметру — по кутам',holes:4},{l:'По периметру — по кутам та середині',holes:8}]},
  tape:{id:'tape',l:'Двосторонній скотч',t:'select',c:[{l:'Ні'},{l:'Є — по периметру',p:9,per:'perim'}]},
  protect:{id:'protect',l:'Захисна плівка',t:'select',def:1,c:[{l:'Ні'},{l:'Так'}]},

  frame:{id:'frame',l:'Підрамник',t:'select',when:(o,s)=>s.vid===0,c:[
    {l:'Вид 1 — товщина 15 мм, ширина 27 мм',p:1.16,per:'perimCm'},{l:'Вид 2 — товщина 18 мм, ширина 40 мм',p:1.45,per:'perimCm'},
    {l:'Вид 3 — товщина 22 мм, ширина 55 мм',p:1.85,per:'perimCm'},{l:'Вид 4 — товщина 40 мм, ширина 35 мм',p:2.3,per:'perimCm'}]},
  stretch:{id:'stretch',l:'Натягування',t:'chips',def:1,when:(o,s)=>s.vid===0,c:[{l:'Стандартне'},{l:'Галерейне'},{l:'Студійне',p:44,per:'piece'}]},
  hang:{id:'hang',l:'Кріплення',t:'chips',when:(o,s)=>s.vid===0,c:[{l:'Ні'},{l:'Крокодил'},{l:'Підвіси',p:13.2,per:'piece'}]},
  canvasCut:{id:'cut',l:'Порізка',t:'select',when:(o,s)=>s.vid===1,c:[{l:'Є — відвантаження в заданому розмірі',p:2,per:'perim',min:2}]},
};

/* ---------- категорії ---------- */
const PVH_COST={1:90,2:150,3:220,4:280,5:340,6:420,8:540,10:650};
const CATS = {
  banner:{n:'Банер',d:'Банерні вивіски, розтяжки, тенти, брандмауери…',kind:'roll',ico:'banner',terms:'std',big:'weld',
    std:[[800,1800,'Х-баннер'],[800,2000,'Roll-up'],[1000,2000],[1200,1800,'Сіті формат'],[1500,2500],[2300,2600,'Pop-up'],[3000,2000,'Press wall'],[6000,3000,'Бігборд']],
    q:['q720','q1440','photo','uv','none'],
    mats:[
      {n:'Банер 440 лам',t:'Банер 440 г/м² ламінат',rolls:[110,160,220,320],cost:40,pr:{q720:205,q1440:270,none:95}},
      {n:'Банер 440 лит',t:'Банер 440 г/м² литий',rolls:[160,220,320],cost:55,pr:{q720:225,q1440:290,uv:300,none:110}},
      {n:'Банер 510 лит',t:'Банер 510 г/м² литий',rolls:[220,320],cost:70,pr:{q720:250,q1440:315,uv:330,none:130}},
      {n:'Сітка (Mesh)',t:'Сітка (Mesh)',rolls:[160,320],cost:75,pr:{q720:260,uv:340,none:140}},
    ],
    opts:['bannerTwo','bannerCut','eyel','eyelType','eyelDia','eyelStep','hem','pocket','backing']},
  film:{n:'Плівка',d:'Наліпки, плівка для обклеювання вітрин, вивісок, авто…',kind:'roll',ico:'film',terms:'std',big:'parts',
    std:[[210,297,'А4'],[297,420,'А3'],[420,594,'А2'],[594,841,'А1'],[841,1189,'А0'],[1200,1800,'Сіті формат']],
    q:['q1440','photo','uv','uvgl','uvmat','uvcw','uvw','uvwc','uvl','none'],
    lam:[{n:'Ні',t:'Немає ламінації',p:0},{n:'Глянцева',t:'Ламінація глянцева',p:75},{n:'Матова',t:'Ламінація матова',p:75},{n:'Підлогова Захисна',t:'Підлогова захисна Oraguard 250',p:160}],
    mats:[
      {n:'Плівка ГЛ Oracal',t:'Плівка глянцева Oracal (Orajet 3640)',rolls:[105,126,137,152],cost:60,pr:{q1440:330,photo:390,uv:380,uvgl:430,uvmat:430,none:150}},
      {n:'Плівка МАТ Oracal',t:'Плівка матова Oracal (Orajet 3640)',rolls:[105,126,137,152],cost:60,pr:{q1440:330,photo:390,uv:380,uvgl:430,uvmat:430,none:150}},
      {n:'Плівка прозора ГЛ Oracal',t:'Плівка прозора глянцева Oracal (Orajet 3640)',rolls:[126,137,152],cost:65,pr:{q1440:340,uv:390,uvcw:480,uvw:420,uvwc:480,uvl:560,none:160}},
      {n:'Плівка прозора МАТ Oracal',t:'Плівка прозора матова Oracal (Orajet 3640)',rolls:[126,137,152],cost:65,pr:{q1440:340,uv:390,uvcw:480,uvw:420,uvwc:480,uvl:560,none:160}},
      {n:'Плівка Легкознімна',t:'Плівка легкознімна Ritrama (Європа)',rolls:[126,137],cost:85,pr:{q1440:380,uv:420,none:200}},
      {n:'Плівка Black Out',t:'Плівка Black Out Ritrama (Європа)',rolls:[126,137],cost:85,pr:{q1440:380,uv:420,none:200}},
      {n:'Плівка One Way Vision',t:'Плівка перфорована One Way Vision',rolls:[137,152],cost:95,pr:{q1440:420,uv:450,none:220}},
      {n:'Плівка Автомобільна',t:'Плівка автомобільна біла Oracal (Orajet 3651)',rolls:[126,137],cost:110,pr:{q1440:470,uv:500,none:250}},
      {n:'Плівка прозора Автомобільна',t:'Плівка автомобільна прозора Oracal (Orajet 3651)',rolls:[126,137],cost:115,pr:{uv:520,uvcw:600,uvwc:600,none:260}},
      {n:'Плівка Підлогова',t:'Плівка Підлогова Oracal (Orajet 3651)',rolls:[126,137],cost:110,pr:{q1440:470,uv:500}},
      {n:'Плівка біла світловідбивна',t:'Плівка біла світловідбивна ORALITE 5400 010',rolls:[122],cost:300,pr:{uv:800,none:550}},
      {n:'Плівка золото глянцева',t:'Плівка золото глянцева ORACAL 352 003',rolls:[100],cost:200,pr:{uv:650,uvcw:750,uvwc:750,none:420}},
      {n:'Плівка хром глянцева',t:'Плівка хром глянцева ORACAL 352 001',rolls:[100],cost:200,pr:{uv:650,uvcw:750,uvwc:750,none:420}},
      {n:'Плівка хром матова',t:'Плівка хром матова ORACAL 352 002',rolls:[100],cost:200,pr:{uv:650,uvcw:750,uvwc:750,none:420}},
      {n:'Плівка хром глянцева браш',t:'Плівка хром глянцева браш ORACAL 352 907',rolls:[100],cost:220,pr:{uv:680,uvcw:780,none:450},na:1},
    ],
    opts:['filmCut','plot','plotLen','plotCx','pick','mount']},
  paper:{n:'Папір',d:'Афіши, плакати, постери, сітілайти, бігборди…',kind:'roll',ico:'paper',terms:'std',big:'parts',
    std:[[210,297,'А4'],[297,420,'А3'],[420,594,'А2'],[594,841,'А1'],[841,1189,'А0'],[1200,1800,'Сіті формат'],[6000,3000,'Бігборд']],
    q:['q720','q1440','photo','uv','none'],
    lam:[{n:'Ні',t:'Немає ламінації',p:0},{n:'Глянцева 80 мікрон',t:'Ламінація глянцева 80 мкм',p:70},{n:'Матова 80 мікрон',t:'Ламінація матова 80 мкм',p:70}],
    mats:[
      {n:'Папір Blue-back 120',t:'Папір Blue-back 120 г/м²',rolls:[91,106,160,320],cost:20,pr:{q720:110,q1440:150,uv:190,none:50}},
      {n:'Папір City-light 150',t:'Папір City-light 150 г/м²',rolls:[106,137,160],cost:35,pr:{q720:150,q1440:190,photo:240,uv:230,none:80}},
      {n:'Папір City-light 200',t:'Папір City-light 200 г/м²',rolls:[106,137,160],cost:45,pr:{q720:170,q1440:210,photo:260,uv:250,none:95}},
      {n:'Poster paper 190',t:'Poster paper 190 г/м²',rolls:[91,106,137],cost:30,pr:{q1440:170,photo:220,uv:210,none:70}},
    ],
    opts:['paperCut']},
  custom:{n:'Індивідуальне замовлення',d:'Замовити прорахунок комплексного або нестандартного замовлення',kind:'form',ico:'custom'},
  pvh:{n:'ПВХ',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'std',
    std:[[150,150],[100,400],[200,150],[200,350],[500,150],[250,400],[200,600],[250,550],[300,900],[300,1200],[400,1200],[200,300],[300,1000],[400,800],[600,400],[800,600],[1000,750]],
    q:['uv','none'],qLabel:'Друк',
    mats:[1,2,3,4,5,6,8,10].map(t=>({n:`ПВХ ${t}мм`,t:`Спінений ПВХ ${t} мм`,sheet:[205,305],th:t,cost:PVH_COST[t],
      pr:{uv:Math.round(PVH_COST[t]*1.6+260),none:Math.round(PVH_COST[t]*1.6)}})),
    opts:['sheetTwo','pvhCut','hole','holePos','tape']},
  foam:{n:'Пінокартон',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'short',
    std:[[300,900],[300,1200],[400,1200],[300,800],[300,1000],[400,800],[400,300],[600,400],[800,600],[1000,750]],
    q:['uv','none'],qLabel:'Друк',
    mats:[{n:'Пінокартон 5 мм',t:'Пінокартон 5 мм',sheet:[140,300],cost:250,pr:{uv:560,none:400}}],
    opts:['sheetTwo','foamCut','tape']},
  comp:{n:'Композит',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'long',
    std:[[250,400],[200,600],[250,550],[300,900],[300,1200],[400,1200],[300,800],[300,1000],[400,800],[400,300],[600,400]],
    q:['uv','none'],qLabel:'Друк',
    mats:[{n:'Композит білий 3мм',t:'Алюмінієвий композит білий 3 мм',sheet:[150,305],cost:480,pr:{uv:900,none:780}}],
    opts:['compCut','hole','holePos','tape']},
  acril:{n:'Акрил',d:'Номерки, бірки, фотографії, годинники, таблички, фігурні вироби…',kind:'sheet',ico:'acril',terms:'long',
    std:[[150,150],[100,400],[200,150],[200,350],[500,150],[250,400],[200,600],[250,550],[300,900],[100,200],[200,300]],
    q:['uv','uvcw','uvwc','w1','w2','none'],qLabel:'Друк',
    mats:[
      {n:'Молочний 2мм',t:'Акрил молочний 2 мм',sheet:[205,305],cost:520,pr:{uv:1020,uvcw:1170,uvwc:1170,w1:970,w2:1120,none:830}},
      {n:'Молочний 3мм',t:'Акрил молочний 3 мм',sheet:[205,305],cost:700,pr:{uv:1200,uvcw:1350,uvwc:1350,w1:1150,w2:1300,none:1120}},
      {n:'Прозорий 2мм',t:'Акрил прозорий 2 мм',sheet:[205,305],cost:500,pr:{uv:1000,uvcw:1150,uvwc:1150,w1:950,w2:1100,none:800}},
      {n:'Прозорий 3мм',t:'Акрил прозорий 3 мм',sheet:[205,305],cost:680,pr:{uv:1180,uvcw:1330,uvwc:1330,w1:1130,w2:1280,none:1090}},
    ],
    opts:['sheetTwo','acrCut','hole','holePos','tape','protect']},
  canvas:{n:'Полотна',d:'Полотна, картини, модулі…',kind:'roll',ico:'canvas',terms:'std',big:'parts',
    vids:[{n:'Друк з натягуванням на підрамник',ico:'frame'},{n:'Друк на полотні',ico:'roll'}],
    std:[[300,200],[300,300],[400,300],[600,400],[700,500],[900,600],[1100,800],[1000,1000],[1300,1000],[1600,1300]],
    q:['uv','none'],
    mats:[
      {n:'Matt 340 г/м² натуральне',t:'Полотно Matt 340 г/м², натуральне',rolls:[107,152],cost:170,pr:{uv:520,none:300}},
      {n:'Matt 240 г/м² синтетика',t:'Полотно Matt 240 г/м², синтетика',rolls:[107,152],cost:90,pr:{uv:400,none:200}},
    ],
    opts:['frame','stretch','hang','canvasCut']},
  stands:{n:'Мобільні стенди',d:'X-banner, L-banner, Roll-up, Press-wall…',kind:'stand',ico:'stand',terms:'short',
    vids:[
      {n:'X-banner',ico:'x',sizes:[[600,1600,581.87],[600,1600,1052.97,'посилений'],[800,1800,1204.28],[1200,2000,2408.58]]},
      {n:'Roll-up',ico:'roll',sizes:[[850,2000,1650],[1000,2000,1890],[1200,2000,2290]]},
      {n:'Press-Wall',ico:'wall',sizes:[[2250,2250,7900],[3000,2250,9600]]},
      {n:'Затискачі для постерів',ico:'clip',sizes:[[594,841,350,'А1'],[841,1189,520,'А0']]}],
    q:['q1440','photo','uv'],
    mats:[], opts:[]},
};
CATS.stands.mats = CATS.banner.mats.slice(0,3).map(m=>({...m,pr:{q1440:m.pr.q1440,photo:m.pr.q1440+60,uv:m.pr.uv||m.pr.q1440+30}}));
const ORDER=['banner','film','paper','custom','pvh','foam','comp','acril','canvas','stands'];

/* =====================================================================
   ІКОНКИ
   ===================================================================== */
const sv=(p,w=1.7)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  plus:sv('<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 2"/><path d="M12 8v8M8 12h8"/>'),
  orders:sv('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4"/>'),
  cart:sv('<path d="M3 4h2l2.4 11h10.8L21 7H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'),
  fin:sv('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h2M12 18h2"/>'),
  msg:sv('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01" stroke-width="2.5"/>'),
  user:sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  gift:sv('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>'),
  help:sv('<path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1zM21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z"/>'),
  exit:sv('<path d="M12 3v8"/><path d="M7 6.5a7 7 0 1 0 10 0"/>'),
  doc:sv('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',1.8),
  clock:sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',1.8),
  printer:sv('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',1.8),
  width:sv('<path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4M4 4v16M20 4v16"/>',1.8),
  layers:sv('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',1.8),
  tag:sv('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',1.8),
  chat:sv('<path d="M4 5h16v11H9l-5 4z"/>',1.8),
  warn:sv('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',1.8),
  no:'<svg class="no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  banner:sv('<rect x="3" y="6" width="18" height="11" rx="1"/><circle cx="5.5" cy="8.5" r=".8"/><circle cx="18.5" cy="8.5" r=".8"/><circle cx="5.5" cy="14.5" r=".8"/><circle cx="18.5" cy="14.5" r=".8"/>'),
  film:sv('<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M8 14l3-3 5 5"/>'),
  paper:sv('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>'),
  custom:sv('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>'),
  sheet:sv('<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v5l8 4 8-4V7"/>'),
  acril:sv('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 16L16 8M8 11l3-3"/>'),
  canvas:sv('<rect x="4" y="4" width="16" height="13"/><path d="M4 14l5-4 4 3 3-2 4 3M9 21l3-4 3 4"/>'),
  stand:sv('<rect x="7" y="3" width="10" height="15"/><path d="M12 18v3M8 21h8"/>'),
};
const VIDS = {
  frame:'<svg viewBox="0 0 70 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="10" width="42" height="50"/><path d="M14 10l6 5h30l6-5M20 15v40M50 15v40M14 60l6-5h30l6 5"/></svg>',
  roll:'<svg viewBox="0 0 70 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="18" y="8" width="34" height="46"/><path d="M14 54h42v5H14zM24 59l-4 6M46 59l4 6"/></svg>',
  x:'<svg viewBox="0 0 70 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="22" y="6" width="26" height="48"/><path d="M22 6l-8 58M48 6l8 58M35 54v10"/></svg>',
  wall:'<svg viewBox="0 0 70 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="10" width="58" height="42"/><path d="M6 52l-2 10M64 52l2 10M35 52v10"/><path d="M6 31h58M25 10v42M45 10v42" stroke-opacity=".35"/></svg>',
  clip:'<svg viewBox="0 0 70 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="16" y="14" width="38" height="44"/><path d="M12 10h46v6H12zM12 56h46v6H12z"/></svg>',
};

/* =====================================================================
   СТАН
   ===================================================================== */
const S = {
  cat:null, vid:0, unit:'mm', std:0, sizes:[], kits:1, opts:{}, plotLen:{mode:0,len:50,obj:1}, standMode:0,
  f:{mats:new Set(), q:new Set(), lam:new Set(), terms:new Set()}, termsOn:false,
  tir:[1,2,5,10,30,50], delivery:false, perUnit:false, picked:null,
};

/* =====================================================================
   РОЗРАХУНОК (внутрішній — клієнт бачить тільки ціни)
   ===================================================================== */
const fmt = n => n.toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(',','.');
const fmt1 = n => (+n.toFixed(2)).toLocaleString('uk-UA');
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plain = s => s.replace(/<br>/g,' ');
// поле (зазор під друк): своє в матеріалу або загальне для рулонів / листів
const marginFor = (cat,mat) => mat&&mat.margin!=null ? mat.margin : (cat.kind==='sheet' ? CFG.marginSheet : CFG.marginRoll);

// Розбивка на частини, якщо виріб не влазить у найширший рулон / лист
function splitItems(sizes, cat, mat, m){
  const ov = cat.big==='weld' ? 4 : 1;
  const A = (mat.rolls?Math.max(...mat.rolls):Math.max(...mat.sheet)) - 2*m;
  const B = mat.rolls ? Infinity : Math.min(...mat.sheet) - 2*m;
  const need=(len,lim)=> len<=lim ? 1 : (lim<=ov ? Infinity : Math.ceil((len-ov)/(lim-ov)));
  return sizes.map(s=>{
    let best=null;
    for (const [p,q] of [[s.w,s.h],[s.h,s.w]]){ const c=need(p,A), k=need(q,B); if(!best||c*k<best.n) best={p,q,c,k,n:c*k}; }
    if(!isFinite(best.n)) return {err:true};
    const {p,q,c,k,n}=best;
    return {...s, parts:n, pw:p/c+(c>1?ov:0), ph:q/k+(k>1?ov:0), seam:(c-1)*q+(k-1)*p};
  });
}
function orient(fw,fh,W,H,pol){
  const a=[fw,fh], b=[fh,fw], fits=o=>o[0]<=W+1e-9&&o[1]<=H+1e-9;
  const pref = pol==='long'?(fw>=fh?[a,b]:[b,a]) : pol==='short'?(fw<=fh?[a,b]:[b,a]) : pol==='rot'?[b,a]:[a,b];
  return pref.find(fits)||null;
}
const POLS=['long','short','asis','rot'];
function packStrip(items,W,pol){
  const rs=[]; for(const it of items){ const o=orient(it.fw,it.fh,W,Infinity,pol); if(!o) return null; rs.push({w:o[0],h:o[1]}); }
  rs.sort((a,b)=>b.h-a.h||b.w-a.w); const sh=[]; let L=0;
  for(const r of rs){ let s=sh.find(s=>s.used+r.w<=W+1e-9&&r.h<=s.h+1e-9); if(!s){s={y:L,h:r.h,used:0};sh.push(s);L+=r.h;} r.x=s.used;r.y=s.y;s.used+=r.w; }
  return {L,rects:rs};
}
function packSheets(items,SW,SH,pol){
  const rs=[]; for(const it of items){ const o=orient(it.fw,it.fh,SW,SH,pol); if(!o) return null; rs.push({w:o[0],h:o[1]}); }
  rs.sort((a,b)=>b.h-a.h||b.w-a.w); const sheets=[];
  for(const r of rs){ let ok=false;
    for(let i=0;i<sheets.length&&!ok;i++){ const T=sheets[i]; const s=T.sh.find(s=>s.used+r.w<=SW+1e-9&&r.h<=s.h+1e-9);
      if(s){r.x=s.used;r.y=s.y;r.s=i;s.used+=r.w;ok=true;}
      else if(T.H+r.h<=SH+1e-9){T.sh.push({y:T.H,h:r.h,used:r.w});r.x=0;r.y=T.H;r.s=i;T.H+=r.h;ok=true;} }
    if(!ok){sheets.push({sh:[{y:0,h:r.h,used:r.w}],H:r.h});r.x=0;r.y=0;r.s=sheets.length-1;} }
  return {sheets,rects:rs};
}

const LCACHE=new Map();
function layout(cat, mat, sizes, mult){
  const m=marginFor(cat,mat);
  const key=[mat.n,m,CFG.leftoverMin,mult,sizes.map(s=>s.w+'x'+s.h).join(',')].join('|');
  if(LCACHE.has(key)) return LCACHE.get(key);
  const sp=splitItems(sizes,cat,mat,m);
  if(sp.some(s=>s.err)) return null;
  let printArea=0, seam=0, nTotal=0; const items=[];
  for(const s of sp){ const n=mult*s.parts; nTotal+=n; printArea+=n*s.pw*s.ph/1e4; seam+=s.seam*mult;
    items.push({fw:s.pw+2*m,fh:s.ph+2*m,n}); }
  const uniform = items.length===1;
  let best=null;
  if(mat.rolls){
    for(const W of mat.rolls){
      let L=null, rects=null;
      if(uniform){ const it=items[0];
        for(const [w,h] of [[it.fw,it.fh],[it.fh,it.fw]]){ if(w>W+1e-9) continue; const ac=Math.floor(W/w+1e-9), l=Math.ceil(it.n/ac)*h; if(L==null||l<L){L=l;rects={grid:{w,h,ac},n:it.n};} }
        if(L==null) continue;
      } else { if(nTotal>2500) return null; const flat=items.flatMap(it=>Array(it.n).fill(it));
        for(const pol of POLS){ const r=packStrip(flat,W,pol); if(r&&(L==null||r.L<L)){L=r.L;rects=r.rects;} } if(L==null) continue; }
      const used=W*L/1e4; if(!best||used<best.used-1e-9) best={kind:'roll',W,L,used,rects};
    }
  } else {
    const [a,b]=mat.sheet;
    for(const [SW,SH] of [[a,b],[b,a]]){
      let n,lastH,rects;
      if(uniform){ const it=items[0]; let g=null;
        for(const [w,h] of [[it.fw,it.fh],[it.fh,it.fw]]){ if(w>SW+1e-9||h>SH+1e-9) continue; const ac=Math.floor(SW/w+1e-9), dn=Math.floor(SH/h+1e-9), per=ac*dn;
          const ns=Math.ceil(it.n/per), rem=it.n-(ns-1)*per, lh=Math.ceil(rem/ac)*h;
          if(!g||ns<g.n||(ns===g.n&&lh<g.lastH)) g={n:ns,lastH:lh,grid:{w,h,ac,dn,per}}; }
        if(!g) continue; n=g.n; lastH=g.lastH; rects={grid:g.grid,n:it.n};
      } else { if(nTotal>2500) return null; const flat=items.flatMap(it=>Array(it.n).fill(it)); let r0=null;
        for(const pol of POLS){ const r=packSheets(flat,SW,SH,pol); if(r&&(!r0||r.sheets.length<r0.sheets.length||(r.sheets.length===r0.sheets.length&&r.sheets.at(-1).H<r0.sheets.at(-1).H))) r0=r; }
        if(!r0) continue; n=r0.sheets.length; lastH=r0.sheets.at(-1).H; rects=r0.rects; }
      const lastCounted = (SH-lastH)>=CFG.leftoverMin ? lastH : SH;
      const used=((n-1)*SW*SH+SW*lastCounted)/1e4;
      if(!best||used<best.used-1e-9) best={kind:'sheet',SW,SH,n,lastH,lastCounted,used,rects};
    }
  }
  if(!best) return null;
  const res={...best,printArea,seam,m};
  LCACHE.set(key,res); if(LCACHE.size>5000) LCACHE.clear();
  return res;
}

function eyeletCount(s,pos,step){
  const n=L=>Math.max(2,Math.ceil(L/step)+1);
  switch(pos){ case 'c4': return 4; case 'c8': return 8; case 'trbl': return Math.max(4,Math.ceil(2*(s.w+s.h)/step));
    case 't': case 'b': return n(s.w); case 'tb': return 2*n(s.w); case 'lr': return 2*n(s.h); }
  return 0;
}

// вартість опцій на весь тираж
function optionsCost(cat,sizes,mult,mat){
  let cost=0,k=1; const lines=[]; const o=S.opts;
  for(const id of cat.opts){
    const def=OPT[id]; if(def.when&&!def.when(o,S)) continue; if(def.t==='plotlen') continue;
    const ch=def.c[o[def.id]??def.def??0]; if(!ch) continue;
    if(ch.k) k*=ch.k;
    let c=0;
    for(const s of sizes){
      const area=s.w*s.h/1e4, per=2*(s.w+s.h)/100;
      switch(ch.per){
        case 'piece': c+=ch.p*mult; break;
        case 'area': c+=ch.p*area*mult; break;
        case 'perim': c+=ch.p*per*mult; break;
        case 'perimCm': c+=ch.p*per*100*mult; break;
        case 'perimTh': { const pc=CFG.pvhCut||{base:1.98,perMm:0.66}; c+=(pc.base+((mat.th||1)-1)*pc.perMm)*(ch.x||1)*per*mult; break; }
        case 'pocket': c+=ch.p*[...ch.sides].reduce((t,sd)=>t+((sd==='t'||sd==='b')?s.w:s.h),0)/100*mult; break;
      }
      if(def.id==='eyel'&&ch.pos){ const ep=OPT.eyelDia.c[o.eyelDia||0].ep, st=OPT.eyelStep.c[o.eyelStep??4].step; c+=eyeletCount(s,ch.pos,st)*ep*mult; }
      if(def.id==='plot'&&o.plot===1){ const pm=OPT.plotCx.c[o.plotCx||0].pm; const L=S.plotLen.mode===0?S.plotLen.len/1000:S.plotLen.mode===1?per*S.plotLen.obj*0.6:per; c+=Math.max(L,0.3)*pm*mult; }
      if(def.id==='holePos') c+=ch.holes*(ch.hp??4)*mult;
    }
    if(ch.min&&c>0&&c<ch.min) c=ch.min;
    if(c>0){ cost+=c; lines.push([def.l+': '+ch.l.toLowerCase(),c]); }
  }
  return {cost,k,lines};
}
const volumeD=q=>{ let d=0; for(const t of CFG.volume) if(q>=t.q) d=t.d; return d; };
const isBigItem=()=>{ const c=curCat(); if(c.kind!=='roll') return false; const maxW=Math.max(...c.mats.flatMap(x=>x.rolls))-2*marginFor(c); return curSizes().some(s=>Math.min(s.w,s.h)>maxW); };

/* ціна однієї клітинки прайсу */
function price(cat,mat,qk,lamI,term,tirage){
  const sizes=curSizes(); if(!sizes.length) return null;
  const pr=mat.pr[qk]; if(pr==null) return null;
  const mult=tirage*S.kits;
  const o=optionsCost(cat,sizes,mult,mat);
  let base, info;
  if(cat.kind==='stand'){
    const st=cat.vids[S.vid].sizes[S.std], cons=st[2]*mult;
    const L = S.standMode===2 ? null : layout(CATS.banner,mat,sizes,mult);
    const prn = L ? L.printArea*pr+(L.used-L.printArea)*mat.cost*(1+CFG.markup) : 0;
    base=(S.standMode!==1?cons:0)+prn; info={L,cons,prn};
  } else {
    const L=layout(cat,mat,sizes,mult); if(!L) return null;
    const lam=cat.lam?cat.lam[lamI].p:0;
    const printCost=L.printArea*(pr*o.k+lam);
    const waste=Math.max(0,L.used-L.printArea), wasteCost=waste*mat.cost*(1+CFG.markup);
    const seamCost=(cat.big==='weld'&&(S.opts.big||0)===0)?L.seam/100*24:0;
    base=printCost+wasteCost+o.cost+seamCost; info={L,printCost,waste,wasteCost,seamCost,lam};
  }
  const afterTerm=base*term.k, vd=volumeD(tirage), lv=CFG.levels.find(l=>l.id===CFG.level).d;
  const deliv=S.delivery?80+18*((info.L&&info.L.printArea)||1):0;
  const total=afterTerm*(1-vd)*(1-lv)+deliv;
  return {total,per:total/mult,base,afterTerm,vd,lv,o,info,deliv,mult};
}

/* =====================================================================
   ДАТИ (неділя — вихідний)
   ===================================================================== */
const WD=['нд','пн','вт','ср','чт','пт','сб'];
function ready(term,extraDays=0){
  const d=new Date(); let lab;
  if(term.hours){ d.setHours(d.getHours()+term.hours); if(d.getHours()>=19){ d.setDate(d.getDate()+1); d.setHours(12,0,0,0);} if(d.getDay()===0) d.setDate(d.getDate()+1); lab=term.hours+'ч';
    for(let n=extraDays;n>0;){ d.setDate(d.getDate()+1); if(d.getDay()!==0) n--; } if(extraDays) lab+='+'+extraDays+'д'; }
  else { let n=term.days+extraDays; while(n>0){ d.setDate(d.getDate()+1); if(d.getDay()!==0) n--; } lab=(term.days+extraDays)+'д'; }
  return {lab,d,txt:`на ${String(d.getDate()).padStart(2,'0')} ${String(d.getMonth()+1).padStart(2,'0')}, ${WD[d.getDay()]}`};
}

/* =====================================================================
   ДОПОМІЖНЕ
   ===================================================================== */
const curCat=()=>CATS[S.cat];
const stdList=()=>{ const c=curCat(); return c.kind==='stand'?c.vids[S.vid].sizes:c.std; };
function curSizes(){ // см
  const c=curCat(); const k=S.unit==='mm'?0.1:1;
  if(c.kind==='stand'){ const s=c.vids[S.vid].sizes[S.std]; return [{w:s[0]/10,h:s[1]/10}]; }
  const own=S.sizes.filter(s=>+s.w>0&&+s.h>0).map(s=>({w:+s.w*k,h:+s.h*k}));
  if(own.length) return own;
  const s=c.std[S.std]; return s?[{w:s[0]/10,h:s[1]/10}]:[];
}


/* ---------- малюнок розкладки (внутрішнє: адмінка, черга виробництва) ---------- */
function drawLayout(L){
  const m=L.m;
  const fromGrid=(g,n,cap,sheetIdx)=>{ const out=[]; for(let i=0;i<Math.min(n,cap);i++){ const s=g.per?Math.floor(i/g.per):0; if(sheetIdx!=null&&s!==sheetIdx) continue; const j=g.per?i%g.per:i; out.push({x:(j%g.ac)*g.w,y:Math.floor(j/g.ac)*g.h,w:g.w,h:g.h}); } return out; };
  const one=(len,wid,rects,title,cut)=>{ const s=Math.min(1.6,180/wid,500/Math.max(len,1)), W=Math.max(len*s,30), H=wid*s;
    let g=`<rect width="${W}" height="${H}" fill="var(--waste)" stroke="var(--waste-line)"/>`;
    for(const r of rects){ const x=r.y*s,y=r.x*s,w=r.h*s,h=r.w*s,ms=m*s; g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--margin)" stroke="var(--card)"/><rect x="${x+ms}" y="${y+ms}" width="${Math.max(0,w-2*ms)}" height="${Math.max(0,h-2*ms)}" fill="var(--print)"/>`; }
    if(cut!=null) g+=`<line x1="${cut*s}" x2="${cut*s}" y1="-3" y2="${H+3}" stroke="var(--bad)" stroke-dasharray="4 3"/>`;
    return `<svg width="${W+4}" height="${H+18}" viewBox="-2 -14 ${W+4} ${H+18}" style="display:block;margin-bottom:8px"><text y="-4" font-size="10" fill="var(--muted)">${title}</text>${g}</svg>`; };
  if(L.kind==='roll') return one(L.L,L.W,L.rects.grid?fromGrid(L.rects.grid,L.rects.n,800):L.rects,`рулон ${L.W} см · довжина ${fmt1(L.L/100)} м →`);
  let out='';
  for(let i=0;i<Math.min(L.n,4);i++) out+=one(L.SH,L.SW,L.rects.grid?fromGrid(L.rects.grid,L.rects.n,4000,i):L.rects.filter(r=>r.s===i),`лист ${i+1}`,i===L.n-1&&L.lastCounted<L.SH?L.lastH:null);
  return out+(L.n>4?`<div style="font-size:12px;color:var(--muted)">+ ще ${L.n-4} листів</div>`:'');
}
