/* Спільне для сайту (calculator.html) і адмінки (admin.html):
   дані каталогу, іконки, стан калькулятора, розрахунок ціни й розкладки.
   У робочій версії дані приходять з бази, а розрахунок стане модулем на сервері. */
/* =====================================================================
   ДАНІ. У робочій версії все це редагується в адмінці.
   Розміри матеріалів — у сантиметрах; стандартні розміри виробів — у мм.
   ===================================================================== */
const CFG = {
  // Прайс від 07.06.2026. Розрахунок: друк = площа виробу × ціна друку; відхід = (рулон × довжина − площа виробу) × ціна відходу.
  nest:false,       // false — кожен виріб займає всю ширину рулону (як у робочій таблиці); true — тираж розкладається поруч
  lenAdd:8,         // запас по довжині рулону на кожен виріб, см
  marginRoll:5,     // поле під друк з кожного боку по ширині рулону, см
  marginSheet:1,    // те саме для листових, см
  markup:0.30,      // націнка на відхід, якщо в матеріалу не задано ціну відходу
  leftoverMin:30,   // смуга листа від цього розміру — діловий залишок, см
  level:'retail',
  // категорії клієнтів: окремі ціни (коефіцієнт до прайсу). Призначає менеджер у картці клієнта
  ccats:[{id:'retail',n:'Звичайні клієнти',k:1},{id:'agency',n:'Рекламні агентства',k:0.85},{id:'opt',n:'Оптові клієнти',k:0.8}],
  ccat:'retail',
  // друкарські машини — колонки виробничої дошки
  machines:[{id:'m1',n:'Сольвент 3200'},{id:'m2',n:'Екосольвент 1600'},{id:'m3',n:'УФ 1600'}],
  // нагадування про оплату для друку без оплати
  remind:{on:true,every:1,onDay:true,overdue:true},
  // максимальна ширина друку, мм (поверх ширини рулону): більше — ділимо на частини
  printMax:{eco:1600,eco2:1600,uv:1600,uvw:1600,uvwc:1600},
  overlap:20,
  // канали надсилання рахунків (бізнес-акаунти; у тестовій версії відправка імітується)
  msg:{auto:true,email:{on:true,v:'office@druk.test'},tg:{on:true,v:'@druk_orders_bot'},wa:{on:true,v:'+380 44 000 00 00'},vb:{on:false,v:''}},       // нахльост при поділі на частини, мм
  levels:[{id:'retail',name:'Базовий',d:0},{id:'regular',name:'Постійний',d:0},{id:'partner',name:'Партнер',d:0},{id:'agency',name:'Агенція',d:0}],
  volume:[{q:1,d:0}],  // знижка від тиражу
  tirageList:[1,2,3,4,5,10,15,20,25,30,40,50,75,100,150,200,250,300,500,1000],
};

const Q = {
  sol:{n:'Сольвент<br>540, 720 dpi',t:"Сольвентний друк 540 / 720 dpi\nВулична реклама: банери, плакати, бігборди"},
  eco:{n:'ЕКО Сольвент<br>720, 1440 dpi',t:"Екосольвентний друк 720 / 1440 dpi\nІнтер'єр і близька відстань перегляду"},
  eco2:{n:'ЕКО Сольвент<br>1440 dpi',t:'Екосольвентний друк 1440 dpi — максимальна деталізація'},
  q720:{n:'720 dpi',t:"СТАНДАРТ (екстер'єр)\nЗвичайна якість: сітілайт, вивіска"},
  q1440:{n:'1440 dpi',t:"ПРЕМІУМ (екстер'єр, інтер'єр)\nЗвичайна якість: плакат, наліпка"},
  photo:{n:'1440 Фото',t:"ФОТО друк (екстер'єр, інтер'єр)\nФотографічна якість відбитку"},
  uv:{n:'УФ друк<br>до 1600 мм',t:"УФ друк, ширина до 1600 мм\nСтійкий до стирання й вицвітання"},
  uvgl:{n:'1440 УФ CMYK<br>+ ГЛ лак',t:'УФ друк + Глянцевий лак'},
  uvmat:{n:'1440 УФ CMYK<br>+ МАТ лак',t:'УФ друк + Матовий лак'},
  uvcw:{n:'1440 УФ CMYK<br>+ WHITE',t:'УФ друк в 2-а шари CMYK + WHITE'},
  uvw:{n:'УФ друк<br>+ білий',t:'УФ друк на прозорій плівці з білим шаром'},
  uvwc:{n:'УФ друк<br>+ білий + колір',t:'УФ друк на прозорій плівці: білий шар + колір'},
  uvl:{n:'1440 УФ<br>Шарами',t:'УФ шарами'},
  w1:{n:'WHITE',t:'УФ друк WHITE'},
  w2:{n:'WHITE<br>2-а шари',t:'УФ друк WHITE у 2 шари'},
  none:{n:'Без<br>друку',t:'Відвантаження без друку з порізкою'},
};

const TERMS = {
  std:[{id:'d1',n:'Стандарт',s:'1 день',days:1,k:1}],
  short:[{id:'d1',n:'Стандарт',s:'1 день',days:1,k:1}],
  long:[{id:'d3',n:'3 дні',s:'',days:3,k:1}],
};

/* ---------- опції ---------- */
// per: piece | perim (за м пог. периметра) | perimCm | area (м²) | pocket | perimTh (залежить від товщини)
const OPT = {
  bannerTwo:{id:'two',l:'Друк з двох сторін',t:'select',c:[{l:'Ні'},{l:'Книгою на спільні люверси',k:2}]},
  bannerCut:{id:'cut',l:'Порізка',t:'select',def:1,c:[{l:'Ні — відвантаження в рулоні'},{l:'Ручна порізка в розмір',p:8,per:'perim'}]},
  eyel:{id:'eyel',l:'Люверсовка',t:'select',c:[
    {l:'Ні'},{l:'По периметру',pos:'trbl'},{l:'По міткам в макеті',pos:'trbl'},{l:'По кутам',pos:'c4'},
    {l:'По кутам та середині',pos:'c8'},{l:'Тільки зверху',pos:'t'},{l:'Тільки знизу',pos:'b'},
    {l:'Зверху та знизу',pos:'tb'},{l:'Зліва та справа',pos:'lr'}]},
  eyelType:{id:'eyelType',l:'Люверсовка',t:'select',sub:1,when:o=>o.eyel>0,c:[{l:'З підворотом країв'},{l:'Без підворота'},{l:'Без підворота з підкладкою під люверси'}]},
  eyelDia:{id:'eyelDia',l:'Люверси',t:'select',sub:1,when:o=>o.eyel>0,c:[{l:'Стандартні',ep:4.5}]},
  eyelStep:{id:'eyelStep',l:'Крок між люверсами',t:'select',sub:1,def:4,when:o=>o.eyel>0&&o.eyel!==3&&o.eyel!==4,
    c:[100,150,200,250,300,350,400,450,500].map(v=>({l:v+' мм'+(v===300?' — стандарт':''),step:v/10}))},
  hem:{id:'hem',l:'Пропайка швів (підворот)',t:'select',c:[{l:'Ні'},{l:'По периметру',p:80,per:'perim'}]},
  pocket:{id:'pocket',l:'Кишеня під трубу',t:'select',c:[{l:'Ні'},
    ...[['Тільки зверху','t'],['Тільки знизу','b'],['Тільки зліва','l'],['Тільки справа','r'],['Зверху та знизу','tb'],['Зліва та справа','lr']].map(([l,s])=>({l,p:30,per:'pocket',sides:s}))]},
  pocketH:{id:'pocketH',l:'Висота кишені',t:'chips',sub:1,def:1,when:o=>o.pocket>0,note:'Припуск на кишеню додається до техрозміру',c:[{l:'50 мм',h:50},{l:'100 мм',h:100},{l:'150 мм',h:150},{l:'Своя висота'}]},
  pocketHc:{id:'pocketHc',l:'Своя висота кишені, мм',t:'num',sub:1,def:120,when:o=>o.pocket>0&&o.pocketH===3},
  backing:{id:'backing',l:'Підкладка',t:'select',c:[{l:'Ні'},{l:'Так',p:40,per:'area'}]},

  filmCut:{id:'cut',l:'Порізка',t:'chips',c:[{l:'Ні'},{l:'Ручна (тільки прямокутні вироби)',p:8,per:'perim'},{l:'Плотерна проста',pm:5},{l:'Плотерна складна',pm:10}],
    note:'Ручна — по прямих лініях. Фігурні контури, наліпки — плотерна'},
  plotLen:{id:'plotLen',l:'Довжина лінії різання',t:'plotlen',sub:1,when:o=>o.cut>=2},
  pick:{id:'pick',l:'Каплівка (вибірка зайвої плівки)',t:'chips',sub:1,when:o=>o.cut>=2,c:[{l:'Ні'},{l:'Проста',p:300,per:'area'},{l:'Складна',p:400,per:'area'}]},
  mount:{id:'mount',l:'Прикатка на транспортну плівку',t:'chips',sub:1,when:o=>o.cut>=2,c:[{l:'Ні'},{l:'Так',p:150,per:'area'}]},
  lamF:{id:'lamF',l:'Ламінація',t:'chips',c:[{l:'Ні'},{l:'Глянцева',p:120,per:'area'},{l:'Матова',p:120,per:'area'}]},
  nakat:{id:'nakat',l:'Накатка плівки на ПВХ / композит',t:'chips',c:[{l:'Ні'},{l:'Так',p:120,per:'area'}]},
  paperCut:{id:'cut',l:'Порізка в розмір',t:'chips',c:[{l:'Ні'},{l:'Ручна порізка',p:8,per:'perim'}]},

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

  frame:{id:'frame',l:'Рама',t:'select',when:(o,s)=>s.vid===0,c:[{l:'Рама дерев’яна для картин',p:60,per:'perim'}]},
  stretch:{id:'stretch',l:'Натяжка',t:'chips',when:(o,s)=>s.vid===0,c:[{l:'Натяжка холста на раму',p:150,per:'area'}]},
  wrap:{id:'wrap',l:'Тип натяжки (обов’язково)',t:'chips',sub:1,when:(o,s)=>s.vid===0,note:'Ширина задруківки на підрамнику — до 970 мм (загин уже враховано)',c:[{l:'Галерейна — задруківка торців',p:40,per:'perim',print:1},{l:'Проста — білі поля на торцях'}]},
  hang:{id:'hang',l:'Кріплення',t:'chips',when:(o,s)=>s.vid===0,c:[{l:'Ні'},{l:'Крокодил'},{l:'Підвіси',p:13.2,per:'piece'}]},
  canvasCut:{id:'cut',l:'Порізка',t:'select',when:(o,s)=>s.vid===1,c:[{l:'Ні'},{l:'Ручна порізка в розмір',p:8,per:'perim'}]},
};

/* ---------- категорії ---------- */
const PVH_COST={1:90,2:150,3:220,4:280,5:340,6:420,8:540,10:650};
const CATS = {
  posters:{n:'Плакати й формати',d:'Плакати А0–А3, сітілайти, бігборди, скроли — ціна за штуку',kind:'roll',ico:'paper',terms:'std',big:'parts',fixed:1,
    std:[[841,1189,'А0'],[594,841,'А1'],[420,594,'А2'],[297,420,'А3'],[1200,1800,'Сітілайт'],[6000,3000,'Бігборд'],[3140,2320,'Скрол']],
    q:['sol','eco'],
    mats:[
      {n:'Папір City-light (білий)',t:'Папір City-light, білий',rolls:[125,160],waste:35,cost:35,pr:{sol:75,eco:115},
        fx:{'841x1189':{sol:78,eco:120},'594x841':{sol:40,eco:60},'420x594':{sol:20,eco:30},'297x420':{sol:10,eco:15},'1200x1800':{sol:200,eco:250}}},
      {n:'Папір Blueback',t:'Папір Blueback, задня сторона синя',rolls:[126,156],waste:20,cost:20,pr:{sol:45},
        fx:{'841x1189':{sol:48},'594x841':{sol:24},'420x594':{sol:12},'297x420':{sol:6},'1200x1800':{sol:110},'6000x3000':{sol:600}}},
      {n:'Поліман',t:'Поліман',rolls:[126,315],waste:0,cost:0,pr:{sol:210},fx:{'1200x1800':{sol:500},'3140x2320':{sol:1350}}},
      {n:'Банер литий 440 г',t:'Банер литий 440 г/м²',rolls:[110, 127, 137, 160, 220, 250, 320],waste:80,cost:80,pr:{sol:160},fx:{'6000x3000':{sol:3400}}},
    ],
    opts:[]},
  banner:{n:'Банер',d:'Банерні вивіски, розтяжки, тенти, брандмауери…',kind:'roll',ico:'banner',terms:'std',big:'weld',
    std:[[800,1800,'Х-баннер'],[800,2000,'Roll-up'],[1000,2000],[1200,1800,'Сіті формат'],[1500,2500],[2300,2600,'Pop-up'],[3000,2000,'Press wall'],[6000,3000,'Бігборд']],
    q:['sol','eco','uv'],
    mats:[
      {n:'Банер ламінований 440 г',t:'Банер ламінований 440 г/м²',rolls:[110, 127, 137, 160, 220, 250, 320],waste:70,cost:70,pr:{sol:150,eco:160}},
      {n:'Банер литий 440 г',t:'Банер литий 440 г/м²',rolls:[110, 127, 137, 160, 220, 250, 320],waste:80,cost:80,pr:{sol:160,eco:175,uv:360}},
      {n:'Банер литий 510 г',t:'Банер литий 510 г/м²',rolls:[110, 127, 137, 160, 220, 250, 320],waste:0,cost:0,pr:{},na:1},
      {n:'Банер литий 440 г (Blockout)',t:'Банер литий 440 г/м², Blockout',rolls:[110, 127, 137, 160, 220, 250, 320],waste:0,cost:0,pr:{},na:1},
      {n:'Банер литий 510 г (Back Lit)',t:'Банер литий 510 г/м², Back Lit',rolls:[110, 127, 137, 160, 220, 250, 320],waste:0,cost:0,pr:{},na:1},
      {n:'Банерна сітка Mesh',t:'Банерна сітка Mesh',rolls:[220,250,320],waste:107.5,cost:107.5,pr:{sol:185}},
    ],
    opts:['bannerCut','eyel','eyelType','eyelDia','eyelStep','hem','pocket','pocketH','pocketHc']},
  film:{n:'Плівка',d:'Наліпки, плівка для обклеювання вітрин, вивісок, авто…',kind:'roll',ico:'film',terms:'std',big:'parts',
    std:[[210,297,'А4'],[297,420,'А3'],[420,594,'А2'],[594,841,'А1'],[841,1189,'А0'],[1200,1800,'Сіті формат']],
    q:['sol','eco','uv','uvw','uvwc'],
    mats:[
      {n:'Плівка біла мат/глянець (Orajet 3640)',t:'Плівка біла матова / глянцева, Orajet 3640',rolls:[105,126,137,160],waste:100,cost:100,pr:{sol:180,eco:200,uv:360}},
      {n:'Плівка прозора мат/глянець (Orajet 3640)',t:'Плівка прозора матова / глянцева, Orajet 3640',rolls:[105,126,137,160],waste:100,cost:100,pr:{sol:180,eco:200,uv:360,uvw:500,uvwc:650}},
      {n:'Плівка Блекаут (Orajet 3641)',t:'Плівка Блекаут біла глянець, сірий клей, Orajet 3641',rolls:[105,126,137,160],waste:115,cost:115,pr:{sol:200,eco:220}},
      {n:'Автоплівка (литий вініл)',t:'Автоплівка литого типу для обклеювання авто, кривих поверхонь',rolls:[137,152],waste:250,cost:250,pr:{sol:380,eco:420}},
      {n:'Плівка перфорована (One Way Vision)',t:'Плівка перфорована One Way Vision',rolls:[106,127,152],waste:140,cost:140,pr:{sol:210,eco:230}},
      {n:'Плівка кольорова для висічки (Orajet 641)',t:'Плівка Orajet 641 кольорова для висічки',rolls:[100],waste:300,cost:300,pr:{sol:400,eco:400}},
    ],
    opts:['lamF','filmCut','plotLen','pick','mount','nakat']},
  paper:{n:'Папір',d:'Афіші, плакати, постери довільного розміру — ціна за м²',kind:'roll',ico:'paper',terms:'std',big:'parts',
    std:[[210,297,'А4'],[297,420,'А3'],[420,594,'А2'],[594,841,'А1'],[841,1189,'А0'],[1200,1800,'Сіті формат'],[6000,3000,'Бігборд']],
    q:['sol','eco'],
    mats:[
      {n:'Папір City-light (білий)',t:'Папір City-light, білий',rolls:[125,160],waste:35,cost:35,pr:{sol:75,eco:115}},
      {n:'Папір Blueback',t:'Папір Blueback, задня сторона синя',rolls:[126,156],waste:20,cost:20,pr:{sol:45}},
      {n:'Поліман',t:'Поліман',rolls:[126,315],waste:0,cost:0,pr:{sol:210,eco:245}},
    ],
    opts:['paperCut']},
  custom:{n:'Індивідуальне замовлення',d:'Замовити прорахунок комплексного або нестандартного замовлення',kind:'form',ico:'custom'},
  pvh:{hidden:1,n:'ПВХ',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'std',
    std:[[150,150],[100,400],[200,150],[200,350],[500,150],[250,400],[200,600],[250,550],[300,900],[300,1200],[400,1200],[200,300],[300,1000],[400,800],[600,400],[800,600],[1000,750]],
    q:['uv','none'],qLabel:'Друк',
    mats:[1,2,3,4,5,6,8,10].map(t=>({n:`ПВХ ${t}мм`,t:`Спінений ПВХ ${t} мм`,sheet:[205,305],th:t,cost:PVH_COST[t],
      pr:{uv:Math.round(PVH_COST[t]*1.6+260),none:Math.round(PVH_COST[t]*1.6)}})),
    opts:['sheetTwo','pvhCut','hole','holePos','tape']},
  foam:{hidden:1,n:'Пінокартон',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'short',
    std:[[300,900],[300,1200],[400,1200],[300,800],[300,1000],[400,800],[400,300],[600,400],[800,600],[1000,750]],
    q:['uv','none'],qLabel:'Друк',
    mats:[{n:'Пінокартон 5 мм',t:'Пінокартон 5 мм',sheet:[140,300],cost:250,pr:{uv:560,none:400}}],
    opts:['sheetTwo','foamCut','tape']},
  comp:{hidden:1,n:'Композит',d:'Таблички, вказівники, вивіски, букви, планшети, ростові фігури…',kind:'sheet',ico:'sheet',terms:'long',
    std:[[250,400],[200,600],[250,550],[300,900],[300,1200],[400,1200],[300,800],[300,1000],[400,800],[400,300],[600,400]],
    q:['uv','none'],qLabel:'Друк',
    mats:[{n:'Композит білий 3мм',t:'Алюмінієвий композит білий 3 мм',sheet:[150,305],cost:480,pr:{uv:900,none:780}}],
    opts:['compCut','hole','holePos','tape']},
  acril:{hidden:1,n:'Акрил',d:'Номерки, бірки, фотографії, годинники, таблички, фігурні вироби…',kind:'sheet',ico:'acril',terms:'long',
    std:[[150,150],[100,400],[200,150],[200,350],[500,150],[250,400],[200,600],[250,550],[300,900],[100,200],[200,300]],
    q:['uv','uvcw','uvwc','w1','w2','none'],qLabel:'Друк',
    mats:[
      {n:'Молочний 2мм',t:'Акрил молочний 2 мм',sheet:[205,305],cost:520,pr:{uv:1020,uvcw:1170,uvwc:1170,w1:970,w2:1120,none:830}},
      {n:'Молочний 3мм',t:'Акрил молочний 3 мм',sheet:[205,305],cost:700,pr:{uv:1200,uvcw:1350,uvwc:1350,w1:1150,w2:1300,none:1120}},
      {n:'Прозорий 2мм',t:'Акрил прозорий 2 мм',sheet:[205,305],cost:500,pr:{uv:1000,uvcw:1150,uvwc:1150,w1:950,w2:1100,none:800}},
      {n:'Прозорий 3мм',t:'Акрил прозорий 3 мм',sheet:[205,305],cost:680,pr:{uv:1180,uvcw:1330,uvwc:1330,w1:1130,w2:1280,none:1090}},
    ],
    opts:['sheetTwo','acrCut','hole','holePos','tape','protect']},
  canvas:{n:'Холст',d:'Полотна, картини, модулі…',kind:'roll',ico:'canvas',terms:'std',big:'parts',
    vids:[{n:'Друк з натяжкою на раму',ico:'frame'},{n:'Тільки друк на холсті',ico:'roll'}],
    std:[[300,200],[300,300],[400,300],[600,400],[700,500],[900,600],[1100,800],[1000,1000]],
    q:['eco','eco2'],
    mats:[{n:'Холст напівсинтетика',t:'Холст напівсинтетичний',rolls:[61,107,127],waste:0,cost:0,pr:{eco:350,eco2:450}}],
    opts:['frame','stretch','wrap','canvasCut']},
  stands:{hidden:1,n:'Мобільні стенди',d:'X-banner, L-banner, Roll-up, Press-wall…',kind:'stand',ico:'stand',terms:'short',
    vids:[
      {n:'X-banner',ico:'x',sizes:[[600,1600,581.87],[600,1600,1052.97,'посилений'],[800,1800,1204.28],[1200,2000,2408.58]]},
      {n:'Roll-up',ico:'roll',sizes:[[850,2000,1650],[1000,2000,1890],[1200,2000,2290]]},
      {n:'Press-Wall',ico:'wall',sizes:[[2250,2250,7900],[3000,2250,9600]]},
      {n:'Затискачі для постерів',ico:'clip',sizes:[[594,841,350,'А1'],[841,1189,520,'А0']]}],
    q:['eco','uv'],
    mats:[], opts:[]},
};
CATS.stands.mats = CATS.banner.mats.slice(0,2).map(m=>({...m,pr:{eco:m.pr.eco,uv:m.pr.uv||m.pr.eco}}));
// ширини задруківки з таблиці замовника «Ширини матеріалів» (26.11.2026), см на рулон:
// [звичайна, з підворотами / люверсами (банер, сітка, холст на підрамнику), з ламінацією (плівка)]
const PW_TABLE={
  banner:{110:[108,102],127:[125,119],137:[135,129],160:[158,152],220:[218,212],250:[248,242],320:[318,312]},
  mesh:{220:[218,212],250:[248,242],320:[318,312]},
  film:{105:[103,null,101],126:[124,null,122],137:[135,null,133],160:[158,null,156]},
  perf:{106:[104],127:[125],137:[135],152:[150]},
  blue:{126:[124],156:[154]}, city:{125:[123],160:[158]}, poly:{126:[124],315:[314]}, canvas:{107:[105,97]},
};
const pwKey=m=>/сітка|Mesh/i.test(m.n)?'mesh':/^Банер/.test(m.n)?'banner':/перфор/i.test(m.n)?'perf':/^Плівка/.test(m.n)&&!/641/.test(m.n)?'film':/Blueback/i.test(m.n)?'blue':/City-light/i.test(m.n)?'city':/^Поліман/.test(m.n)?'poly':/^Холст/.test(m.n)?'canvas':null;
for(const id in CATS) for(const m of CATS[id].mats||[]){ const k=pwKey(m); if(!k||!m.rolls) continue; m.pw=JSON.parse(JSON.stringify(PW_TABLE[k])); m.rolls=Object.keys(PW_TABLE[k]).map(Number); }
// ширина задруківки рулону W: з таблиці матеріалу або рулон мінус поле з обох боків; mode: p — звичайна, h — з підворотами, l — з ламінацією
function pwOf(cat,mat,W,mode){ const r=mat.pw&&mat.pw[W]; if(r){ if(mode==='h'&&r[1]!=null) return r[1]; if(mode==='l'&&r[2]!=null) return r[2]; if(r[0]!=null) return r[0]; } return W-2*marginFor(cat,mat); }
// який режим ширини обрав клієнт
const curPwm=()=>{ const o=S.opts||{}; if(S.cat==='banner'&&((o.eyel>0&&(o.eyelType||0)===0)||o.hem>0)) return 'h'; if(S.cat==='canvas'&&S.vid===0) return 'h'; if(S.cat==='film'&&o.lamF>0) return 'l'; return 'p'; };
const ORDER=['posters','banner','film','paper','canvas','custom','pvh','foam','comp','acril','stands'];

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
function splitItems(sizes, cat, mat, m, dir=0, pwm='p'){
  const ov = cat.big==='weld' ? 4 : (CFG.overlap??20)/10; // спайка банера 40 мм, нахльост частин — з налаштувань
  const A = mat.rolls ? Math.max(...mat.rolls.map(W=>pwOf(cat,mat,W,pwm))) : Math.max(...mat.sheet) - 2*m;
  const B = mat.rolls ? Infinity : Math.min(...mat.sheet) - 2*m;
  const need=(len,lim)=> len<=lim ? 1 : (lim<=ov ? Infinity : Math.ceil((len-ov)/(lim-ov)));
  return sizes.map(s=>{
    let best=null;
    const ors=dir===1?[[s.w,s.h]]:dir===2?[[s.h,s.w]]:[[s.w,s.h],[s.h,s.w]];
    for (const [p,q] of ors){ const c=need(p,A), k=need(q,B); if(!best||c*k<best.n) best={p,q,c,k,n:c*k}; }
    if(!isFinite(best.n)&&dir) return splitItems([s],cat,mat,m,0,pwm)[0];
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
// mode.nest — розкладати поруч (поворот, кілька в ряд); mode.nm — «без полів»: вироби стик у стик, поле тільки по контуру групи
function layout(cat, mat, sizes, mult, mode={}){
  const m=marginFor(cat,mat), nest=mode.nest??CFG.nest, nm=!!mode.nm&&nest;
  const add=cat.lenAdd??CFG.lenAdd??0;
  const dir=mode.dir||0, pwm=mode.pw||'p';
  const key=[mat.n,(mat.rolls||mat.sheet).join('/'),JSON.stringify(mat.pw||''),pwm,dir,CFG.overlap,m,CFG.leftoverMin,nest,nm,add,mult,sizes.map(s=>s.w+'x'+s.h).join(',')].join('|');
  if(LCACHE.has(key)) return LCACHE.get(key);
  const sp=splitItems(sizes,cat,mat,m,dir,pwm);
  if(sp.some(s=>s.err)) return null;
  let printArea=0, seam=0, nTotal=0; const items=[];
  for(const s of sp){ const n=mult*s.parts; nTotal+=n; printArea+=n*s.pw*s.ph/1e4; seam+=s.seam*mult;
    items.push({fw:s.pw+(nm?0:2*m),fh:s.ph+(nm?0:2*m),n}); }
  const uniform = items.length===1;
  let best=null;
  if(mat.rolls&&!nest){
    // як у робочій таблиці: виріб займає всю ширину рулону, довжина = сторона виробу + запас
    for(const W of mat.rolls){ let L=0, ok=true; const rects=[];
      for(const sz of sp){ const o=[[sz.pw,sz.ph],[sz.ph,sz.pw]].filter(([a])=>a<=pwOf(cat,mat,W,pwm)+1e-9).sort((x,y)=>x[1]-y[1])[0]; if(!o){ ok=false; break; }
        const n=mult*sz.parts; for(let i=0;i<n&&rects.length<300;i++) rects.push({x:0,y:L+i*(o[1]+add),w:W,h:o[1]+add,ia:o[0],ib:o[1]});
        L+=n*(o[1]+add); }
      if(!ok) continue; const used=W*L/1e4; if(!best||used<best.used-1e-9) best={kind:'roll',W,L,used,rects}; }
  } else if(mat.rolls){
    for(const W0 of mat.rolls){
      const P=pwOf(cat,mat,W0,pwm), W=nm?P:P+2*m; let L=null, rects=null;
      if(uniform){ const it=items[0];
        for(const [w,h] of [[it.fw,it.fh],[it.fh,it.fw]]){ if(w>W+1e-9) continue; const ac=Math.floor(W/w+1e-9), l=Math.ceil(it.n/ac)*h; if(L==null||l<L){L=l;rects={grid:{w,h,ac},n:it.n};} }
        if(L==null) continue;
      } else { if(nTotal>2500) return null; const flat=items.flatMap(it=>Array(it.n).fill(it));
        for(const pol of POLS){ const r=packStrip(flat,W,pol); if(r&&(L==null||r.L<L)){L=r.L;rects=r.rects;} } if(L==null) continue; }
      if(nm) L+=2*m; const used=W0*L/1e4; if(!best||used<best.used-1e-9) best={kind:'roll',W:W0,L,used,rects,off:nm?(W0-P)/2:0};
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
  const res={...best,printArea,seam,m:nm?0:m,nm};
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
    const def=OPT[id]; if(def.when&&!def.when(o,S)) continue; if(def.t==='plotlen'||def.t==='num') continue;
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
        case 'pocket': c+=ch.p*pocketH()/100*[...ch.sides].reduce((t,sd)=>t+((sd==='t'||sd==='b')?s.w:s.h),0)/100*mult; break;
      }
      if(def.id==='eyel'&&ch.pos){ const ep=OPT.eyelDia.c[o.eyelDia||0].ep, st=OPT.eyelStep.c[o.eyelStep??4].step; c+=eyeletCount(s,ch.pos,st)*ep*mult; }
      if(ch.pm&&def.id==='cut'){ const pm=ch.pm*(o.lamF>0?1.5:1); const L=S.plotLen.mode===0?S.plotLen.len/1000:S.plotLen.mode===1?per*S.plotLen.obj*0.6:per; c+=Math.max(L,0.3)*pm*mult; }
      if(def.id==='holePos') c+=ch.holes*(ch.hp??4)*mult;
    }
    if(ch.min&&c>0&&c<ch.min) c=ch.min;
    if(c>0){ cost+=c; lines.push([def.l+': '+ch.l.toLowerCase(),c]); }
  }
  return {cost,k,lines};
}
const volumeD=q=>{ let d=0; for(const t of CFG.volume) if(q>=t.q) d=t.d; return d; };
// ширина друку обмежена для екосольвенту / УФ (CFG.printMax, мм): беремо тільки рулони, що влазять у машину
function printMat(mat,qk){ const mx=CFG.printMax&&CFG.printMax[qk]; if(!mx||!mat.rolls) return mat; const r=mat.rolls.filter(W=>W*10<=mx+1e-9); return r.length&&r.length<mat.rolls.length?{...mat,rolls:r}:mat; }
const printLimit=c=>{ const pm=curPwm(), qs=S.f&&S.f.q.size?c.q.filter(q=>S.f.q.has(q)):c.q; return Math.min(...(qs.length?qs:c.q).map(q=>{ const mats=c.mats.filter(x=>!x.na&&x.pr[q]!=null&&x.rolls); return mats.length?Math.max(...mats.map(x=>Math.max(...printMat(x,q).rolls.map(W=>pwOf(c,x,W,pm))))):Infinity; })); };
const isBigItem=()=>{ const c=curCat(); if(c.kind!=='roll'||!c.mats.some(x=>x.rolls)) return false; const lim=printLimit(c); return techSizes(curSizes()).some(s=>Math.min(s.w,s.h)>lim+1e-9); };
// висота кишені, мм
const pocketH=()=>{ const v=OPT.pocketH.c[S.opts.pocketH??1]; return v&&v.h?v.h:Math.max(20,+S.opts.pocketHc||120); };
// техрозмір: виріб + припуски (кишені банера, загин холста на раму), см
function techSizes(sizes){
  const o=S.opts;
  if(S.cat==='banner'){ const pc=OPT.pocket.c[o.pocket||0]; if(pc&&pc.sides){ const H=(pocketH()+30)/10; // кишеня + шов 30 мм
    return sizes.map(s=>{ let w=s.w,h=s.h; for(const sd of pc.sides){ if(sd==='t'||sd==='b') h+=H; else w+=H; } return {w,h}; }); } }
  if(S.cat==='canvas'&&S.vid===0){ const g=OPT.wrap.c[o.wrap||0]; if(g&&g.add){ const a=g.add/10; return sizes.map(s=>({w:s.w+2*a,h:s.h+2*a})); } }
  return sizes;
}

/* ціна однієї клітинки прайсу */
function price(cat,mat,qk,lamI,term,tirage){
  const sizes=curSizes(); if(!sizes.length) return null;
  const pr=mat.pr[qk]; if(pr==null) return null;
  mat=printMat(mat,qk); const tz=techSizes(sizes), md={dir:S.opts.split||0,pw:curPwm()};
  const wp=m=>m.waste??m.cost*(1+CFG.markup); // ціна відходу, грн/м²
  const mult=tirage*S.kits;
  const o=optionsCost(cat,sizes,mult,mat);
  let base, info;
  if(cat.fixed&&!hasOwnSize()){ // фіксована ціна за штуку для стандартного формату; свій розмір рахується за площею
    const st=cat.std[S.std], fx=mat.fx&&mat.fx[st[0]+'x'+st[1]], fp=fx&&fx[qk]; if(fp==null) return null;
    base=fp*mult+o.cost; info={L:null,printCost:fp*mult,waste:0,wasteCost:0,fixed:true};
  } else if(cat.kind==='stand'){
    const st=cat.vids[S.vid].sizes[S.std], cons=st[2]*mult;
    const L = S.standMode===2 ? null : layout(CATS.banner,mat,tz,mult,md);
    const prn = L ? L.printArea*pr+(L.used-L.printArea)*wp(mat) : 0;
    base=(S.standMode!==1?cons:0)+prn; info={L,cons,prn};
  } else {
    const L=layout(cat,mat,tz,mult,md); if(!L) return null;
    const lam=cat.lam?cat.lam[lamI].p:0;
    const printCost=L.printArea*(pr*o.k+lam);
    const waste=Math.max(0,L.used-L.printArea), wasteCost=waste*wp(mat);
    const seamCost=(cat.big==='weld'&&(S.opts.big||0)===0)?L.seam/100*(CFG.seam??80):0;
    base=printCost+wasteCost+o.cost+seamCost; info={L,printCost,waste,wasteCost,seamCost,lam};
  }
  const afterTerm=base*term.k, vd=volumeD(tirage), lv=(CFG.levels.find(l=>l.id===CFG.level)||{d:0}).d;
  const cc=(CFG.ccats||[]).find(x=>x.id===CFG.ccat)||{k:1}; // ціни категорії клієнта
  const deliv=0; // доставку новим клієнтам не нараховуємо; менеджер додає її окремою статтею в замовленні
  const total=afterTerm*(1-vd)*(1-lv)*cc.k+deliv;
  return {total,per:total/mult,base,afterTerm,vd,lv,cc,o,info,deliv,mult};
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
const hasOwnSize=()=>S.sizes.some(s=>+s.w>0&&+s.h>0);
const stdList=()=>{ const c=curCat(); return c.kind==='stand'?c.vids[S.vid].sizes:c.std; };
function curSizes(){ // см; на сайті всі розміри вводяться в мм
  const c=curCat();
  if(c.kind==='stand'){ const s=c.vids[S.vid].sizes[S.std]; return [{w:s[0]/10,h:s[1]/10}]; }
  const own=S.sizes.filter(s=>+s.w>0&&+s.h>0).map(s=>({w:+s.w/10,h:+s.h/10}));
  if(own.length) return own;
  const s=c.std[S.std]; return s?[{w:s[0]/10,h:s[1]/10}]:[];
}


/* ---------- малюнок розкладки (внутрішнє: адмінка, черга виробництва) ---------- */
function drawLayout(L){
  const m=L.m;
  const fromGrid=(g,n,cap,sheetIdx)=>{ const out=[]; for(let i=0;i<Math.min(n,cap);i++){ const s=g.per?Math.floor(i/g.per):0; if(sheetIdx!=null&&s!==sheetIdx) continue; const j=g.per?i%g.per:i; out.push({x:(j%g.ac)*g.w,y:Math.floor(j/g.ac)*g.h,w:g.w,h:g.h}); } return out; };
  const one=(len,wid,rects,title,cut)=>{ const s=Math.min(1.6,180/wid,500/Math.max(len,1)), W=Math.max(len*s,30), H=wid*s;
    let g=`<rect width="${W}" height="${H}" fill="var(--waste)" stroke="var(--waste-line)"/>`;
    const off=L.off||0;
    for(const r of rects){ const x=(r.y+off)*s,y=(r.x+off)*s,w=r.h*s,h=r.w*s,ms=m*s;
      if(r.ia!=null) g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--waste-line)"/><rect x="${x+(w-r.ib*s)/2}" y="${y+(h-r.ia*s)/2}" width="${r.ib*s}" height="${r.ia*s}" fill="var(--print)"/>`;
      else g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--margin)" stroke="var(--card)"/><rect x="${x+ms}" y="${y+ms}" width="${Math.max(0,w-2*ms)}" height="${Math.max(0,h-2*ms)}" fill="var(--print)"/>`; }
    if(cut!=null) g+=`<line x1="${cut*s}" x2="${cut*s}" y1="-3" y2="${H+3}" stroke="var(--bad)" stroke-dasharray="4 3"/>`;
    return `<svg width="${W+4}" height="${H+18}" viewBox="-2 -14 ${W+4} ${H+18}" style="display:block;margin-bottom:8px"><text y="-4" font-size="10" fill="var(--muted)">${title}</text>${g}</svg>`; };
  if(L.kind==='roll') return one(L.L,L.W,L.rects.grid?fromGrid(L.rects.grid,L.rects.n,800):L.rects,`рулон ${L.W*10} мм · довжина ${fmt1(L.L/100)} м →`);
  let out='';
  for(let i=0;i<Math.min(L.n,4);i++) out+=one(L.SH,L.SW,L.rects.grid?fromGrid(L.rects.grid,L.rects.n,4000,i):L.rects.filter(r=>r.s===i),`лист ${i+1}`,i===L.n-1&&L.lastCounted<L.SH?L.lastH:null);
  return out+(L.n>4?`<div style="font-size:12px;color:var(--muted)">+ ще ${L.n-4} листів</div>`:'');
}

/* =====================================================================
   СПІЛЬНЕ СХОВИЩЕ: сайт і адмінка працюють з одними даними.
   Зараз — у пам'яті браузера (localStorage); у робочій версії — база на сервері.
   ===================================================================== */
const DAY=864e5, NOW=new Date();
const dt=(off,h=10,m=0)=>{ const d=new Date(NOW.getTime()+off*DAY); d.setHours(h,m,0,0); return d; };
const p2=n=>String(n).padStart(2,'0');
const dstr=d=>`${p2(d.getDate())}.${p2(d.getMonth()+1)}.${d.getFullYear()}`;
const tstr=d=>`${p2(d.getHours())}:${p2(d.getMinutes())}`;
const DB_KEY='druk_db_v1';
const RE_DATE=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

// каталог: усе, що редагується в налаштуваннях
function collectCatalog(){ return {CATS,ORDER,OPT,CFG:{...CFG,level:undefined,ccat:undefined},Q,TERMS}; }
function applyCatalog(c){
  if(!c) return;
  const sync=(dst,src)=>{ for(const k of Object.keys(dst)) if(!(k in src)) delete dst[k]; Object.assign(dst,src); };
  const when={}; for(const k in OPT) if(OPT[k].when) when[k]=OPT[k].when; // умови показу опцій — у коді
  sync(CATS,c.CATS); sync(OPT,c.OPT); for(const k in when) if(OPT[k]) OPT[k].when=when[k];
  const lvl=CFG.level, cc=CFG.ccat; sync(CFG,c.CFG); CFG.level=lvl; CFG.ccat=cc||'retail'; sync(Q,c.Q); sync(TERMS,c.TERMS);
  ORDER.splice(0,ORDER.length,...c.ORDER); LCACHE.clear();
}
function loadDB(){
  let db=null;
  try{ const raw=localStorage.getItem(DB_KEY); if(raw) db=JSON.parse(raw,(k,v)=>typeof v==='string'&&RE_DATE.test(v)?new Date(v):v); }catch(e){}
  if(!db||db.v!==5) return seedDB();
  applyCatalog(db.cat);
  for(const k of ['gen','bon','tickets']) db[k]=db[k]||{};
  // оновлення збережених даних: роль «Поліграфіст» додано пізніше
  if(!db.mig1){ db.mig1=1; if(!db.roles.some(r=>r.id==='printer')){ db.roles.push({id:'printer',n:'Друкар',perms:['production']}); db.staff.push({...({id:8,login:'printer@druk.test',pass:'print123',n:'Богдан Кравець',role:'printer',online:true,seen:dt(0,8,45)}),id:Math.max(...db.staff.map(x=>x.id))+1}); } }
  return db;
}
function saveDB(db,withCatalog){
  if(withCatalog||!db.cat) db.cat=collectCatalog();
  try{ localStorage.setItem(DB_KEY,JSON.stringify(db)); }catch(e){}
}
// повна сума замовлення: друк + доопрацювання макета + доставка (окремі статті)
const oTotal=o=>o.sum+(o.rework||0)+(o.dlv||0);
// макети готові: є хоч один, і всі актуальні (не замінені) перевірені
const filesOk=fs=>{ const cur=(fs||[]).filter(f=>f.st!=='old'); return cur.length>0&&cur.every(f=>f.st==='ok'); };

// сума за прайсом: друк + відхід (або фіксована ціна формату)
function calcSum(C,m,qk,w,h,n){
  const fx=C.fixed&&m.fx&&m.fx[w+'x'+h]; if(fx&&fx[qk]!=null) return fx[qk]*n;
  const L=layout(C,m,[{w:w/10,h:h/10}],n); if(!L) return 0;
  return Math.round((L.printArea*(m.pr[qk]||0)+Math.max(0,L.used-L.printArea)*(m.waste??m.cost))*100)/100;
}
function seedDB(){
  const RL=[
    {id:'owner',n:'Власник',fixed:1,perms:[]},
    {id:'admin',n:'Адмін',perms:['settings','levels','cost','allOrders','clients','prepress','production','money','reports','assign','staff','behalf','delivery']},
    {id:'accountant',n:'Бухгалтер',perms:['cost','allOrders','clients','money','reports','pay']},
    {id:'mplus',n:'Менеджер+',perms:['cost','allOrders','clients','prepress','production','money','reports','assign','credit','behalf','delivery','rework']},
    {id:'manager',n:'Менеджер',perms:['allOrders','clients','prepress','production','money','credit','behalf','delivery','rework','assign']},
    {id:'designer',n:'Дизайнер',perms:['prepress','rework']},
    {id:'printer',n:'Друкар',perms:['production']},
  ];
  const STAFF=[
    {id:1,login:'vasylkovskyi@druk.test',pass:'owner123',n:'Васільковський',role:'owner',online:true,seen:dt(0,9,2)},
    {id:2,login:'admin@druk.test',pass:'admin123',n:'Ірина Бондар',role:'admin',online:true,seen:dt(0,8,55)},
    {id:3,login:'mplus@druk.test',pass:'mplus123',n:'Марина Шевчук',role:'mplus',online:true,seen:dt(0,9,0)},
    {id:4,login:'manager@druk.test',pass:'manager123',n:'Андрій Ткаченко',role:'manager',online:true,seen:dt(0,9,5)},
    {id:5,login:'manager2@druk.test',pass:'manager123',n:'Дмитро Лисенко',role:'manager',online:true,seen:dt(0,8,30)},
    {id:6,login:'designer@druk.test',pass:'design123',n:'Катерина Руденко',role:'designer',online:true,seen:dt(0,9,10)},
    {id:7,login:'buh@druk.test',pass:'buh123',n:'Оксана Гриценко',role:'accountant',online:true,seen:dt(0,9,20)},
    {id:8,login:'printer@druk.test',pass:'print123',n:'Богдан Кравець',role:'printer',online:true,seen:dt(0,8,45)},
  ];
  const INK={sol:20,eco:30,eco2:40,q720:25,q1440:35,photo:45,uv:60,uvgl:75,uvmat:75,uvcw:90,uvw:70,uvwc:90,uvl:100,w1:60,w2:90,none:0};
  const CL=[
    {id:10245,n:'Олена Коваль',ph:'+380 67 123 45 67',em:'olena@example.com',type:'fop',co:'ФОП Коваль Олена Василівна',level:'regular',cat:'retail',since:dt(-120)},
    {id:10212,n:'Сергій Павленко',ph:'+380 50 222 33 44',em:'office@dvir.example',type:'company',co:'ТОВ «Рекламний двір»',level:'agency',cat:'agency',since:dt(-400)},
    {id:10301,n:'Максим Гончар',ph:'+380 93 555 12 12',em:'max.g@example.com',type:'person',co:'',level:'retail',cat:'retail',since:dt(-3)},
    {id:10188,n:'Ольга Мороз',ph:'+380 66 700 80 90',em:'zerno@example.com',type:'fop',co:'ФОП Мороз О. І. (кав’ярня «Зерно»)',level:'partner',cat:'opt',since:dt(-260)},
    {id:10330,n:'Наталія Яковенко',ph:'+380 97 404 04 04',em:'n.yakovenko@example.com',type:'person',co:'',level:'retail',cat:'retail',since:dt(-1)},
  ];
  const LEDGER=[
    {c:10245,d:dt(-15,9,30),t:'Поповнення балансу карткою',s:5000},{c:10245,d:dt(-14,16,50),t:'Оплата замовлення №47950',s:-2310.5},
    {c:10245,d:dt(-12,12,35),t:'Оплата замовлення №47988',s:-1188},{c:10245,d:dt(-7,11,0),t:'Оплата за рахунком СФ-3074',s:2000},
    {c:10245,d:dt(-6,14,5),t:'Оплата замовлення №48101',s:-1146.3},{c:10245,d:dt(-3,10,25),t:'Оплата замовлення №48152',s:-1912},
    {c:10245,d:dt(-2,10,0),t:'Поповнення балансу карткою',s:2500},{c:10245,d:dt(-1,12,3),t:'Оплата замовлення №48190',s:-1508.6},
    {c:10212,d:dt(-30),t:'Оплата за рахунком СФ-3010',s:30000},{c:10212,d:dt(-20),t:'Оплата замовлення №48170',s:-6240},
    {c:10188,d:dt(-10),t:'Поповнення балансу карткою',s:3000},{c:10188,d:dt(-1,15),t:'Оплата замовлення №48229',s:-1890},
    {c:10330,d:dt(0,8,20),t:'Поповнення балансу карткою',s:1500},{c:10330,d:dt(0,8,22),t:'Оплата замовлення №48220',s:-1230},
  ];
  const INV=[
    {n:'СФ-3121',c:10245,d:dt(0,9,45),o:[48231],s:1340.40,paid:false},
    {n:'СФ-3119',c:10212,d:dt(-1,11,0),o:[48234],s:4120,paid:false},
    {n:'СФ-3074',c:10245,d:dt(-8,15,0),o:[],t:'Поповнення балансу',s:2000,paid:true},
    {n:'СФ-3010',c:10212,d:dt(-31),o:[],t:'Поповнення балансу',s:30000,paid:true},
  ];
  function O(id,c,dOff,cat,mi,qk,w,h,tir,term,readyOff,st,who,x={}){
    const C=CATS[cat], m=C.mats[mi]; if(x.sum==null) x.sum=calcSum(C,m,qk,w,h,tir*(x.kits||1));
    return {id,c,d:dt(dOff,10+(id%8),id%60),cat,mi,mat:m,qk,w,h,tir,kits:x.kits||1,term,ready:dt(readyOff,18),st,who,
      name:m.n,opts:x.opts||[],sum:x.sum,paid:x.paid??(['paid','print','ready','sent','done'].includes(st)?x.sum:0),
      files:x.files||[],deliv:x.deliv||'self',ttn:x.ttn||'',rework:x.rework||0,reworkReq:!!x.reworkReq,fixReason:x.fix||'',
      thread:x.thread||[],log:[{d:dt(dOff,10+(id%8),id%60),t:'Замовлення створено клієнтом'}],title:x.title||'',
      pwm:x.pwm||(/Люверс|підворот/i.test((x.opts||[]).join(' '))?'h':'p'),des:x.des||null,rv:x.rv||(x.des?'todo':'none'),dlv:x.dlv||0,credit:x.credit||null,mach:x.mach||null};
  }
  const ORD=[
    O(48234,10212,0,'film',0,'eco',1000,500,20,'Стандарт 1 день',1,'check',null,{des:6,rv:'todo',files:[{n:'logo_stickers_1000x500.pdf',st:'wait',at:dt(0,9,15)}],opts:['Плотерна порізка: проста'],deliv:'np'}),
    O(48233,10301,0,'banner',1,'sol',2000,1000,1,'Стандарт 1 день',2,'new',null,{opts:['Порізка: в заданому розмірі','Люверсовка по кутам']}),
    O(48231,10245,0,'banner',0,'sol',3000,1000,2,'Стандарт 1 день',1,'check',4,{des:6,rv:'doing',files:[{n:'banner_3000x1000.pdf',st:'wait',at:dt(0,9,40)}],opts:['Порізка: в заданому розмірі','Люверсовка по периметру, 10 мм, крок 300 мм'],deliv:'np'}),
    O(48229,10188,-1,'paper',0,'sol',1200,1800,10,'Стандарт 1 день',0,'paid',3,{files:[{n:'menu_poster.pdf',st:'ok'}],opts:['Порізка в розмір']}),
    O(48226,10212,-4,'banner',1,'sol',6000,3000,1,'Стандарт 1 день',-1,'print',5,{paid:0,credit:{date:dt(-1,0),by:4},mach:'m1',dlv:250,files:[{n:'fasad_6x3.pdf',st:'ok'}],opts:['Зпаювання частин','Люверсовка по периметру, крок 300 мм','Зпаювання підворота'],deliv:'np'}),
    O(48220,10330,0,'posters',0,'eco',594,841,30,'Стандарт 1 день',1,'paid',null,{files:[{n:'tablychky_kabinety.pdf',st:'ok'}]}),
    O(48217,10245,-1,'film',1,'eco',500,700,10,'Стандарт 1 день',1,'fix',3,{kits:2,files:[{n:'stickers_v1.pdf',st:'bad',reason:'Текст ближче ніж 5 мм до лінії порізки; шрифти не переведені в криві.'},{n:'stickers_2.pdf',st:'ok'}],opts:['Плотерна порізка: проста, 2,4 м пог./шт'],fix:'Текст ближче ніж 5 мм до лінії порізки; шрифти не переведені в криві.',
      thread:[{d:dt(-1,16,30),from:'Препрес',t:'Макет stickers_v1.pdf повернено на виправлення…'},{d:dt(-1,16,50),from:'Клієнт',t:'А якщо відступ 3 мм — це критично?'},{d:dt(-1,17,5),from:'Препрес',t:'Так, порізка має допуск ±1,5 мм. Рекомендуємо 5 мм.'}]}),
    O(48215,10188,-1,'film',2,'eco',600,600,4,'Стандарт 1 день',1,'check',6,{des:6,rv:'bad',reworkReq:true,files:[{n:'zerno_logo.jpg',st:'bad',reason:'Низька роздільна здатність (72 dpi) для 1440 dpi'}],opts:['Плотерна порізка: проста'],
      thread:[{d:dt(-1,12),from:'Клієнт',t:'Замовляю доопрацювання — зробіть, будь ласка, векторний логотип.'}]}),
    O(48200,10212,-3,'paper',0,'eco',1200,1800,8,'Стандарт 1 день',-1,'ready',4,{paid:0,credit:{date:dt(3,0),by:4},dlv:180,files:[{n:'citylights_x8.pdf',st:'ok'}],deliv:'np'}),
    O(48190,10245,-2,'paper',0,'eco',1200,1800,4,'Стандарт 1 день',0,'print',4,{mach:'m2',dlv:120,files:[{n:'citylight_1200x1800.tif',st:'ok'}],opts:['Порізка в розмір'],deliv:'np'}),
    O(48152,10245,-3,'posters',1,'sol',1200,1800,5,'Стандарт 1 день',-1,'ready',3,{files:[{n:'tablychky.pdf',st:'ok'}]}),
    O(48101,10245,-6,'canvas',0,'eco2',600,900,1,'Стандарт 1 день',-2,'sent',4,{dlv:95,files:[{n:'kartyna.jpg',st:'ok'}],deliv:'np',ttn:'20450912345678'}),
    O(48170,10212,-20,'banner',1,'sol',4000,2000,3,'Стандарт 1 день',-19,'done',3,{files:[{n:'tents.pdf',st:'ok'}],deliv:'np',ttn:'20450900000077'}),
    O(47988,10245,-12,'banner',1,'eco',800,1800,2,'Стандарт 1 день',-11,'done',4,{files:[{n:'xbanner.pdf',st:'ok'}],deliv:'np',ttn:'20450900011122'}),
    O(47950,10245,-14,'banner',5,'sol',6000,3000,1,'Стандарт 1 день',-12,'done',5,{files:[{n:'fasad_mesh.pdf',st:'ok'}]}),
    O(47911,10245,-16,'film',4,'eco',1200,900,3,'Стандарт 1 день',-15,'cancel',null,{}),
  ];
  ORD.forEach(o=>{ if(['paid','print','ready','sent','done'].includes(o.st)) o.qAt=new Date(o.d.getTime()+3*36e5); });
  const ord=id=>ORD.find(o=>o.id==id);
  LEDGER.forEach(x=>{ const m=/Оплата замовлення №(\d+)/.exec(x.t), o=m&&ord(m[1]); if(o) x.s=-o.sum; });
  for(const c of CL){ const b=LEDGER.filter(x=>x.c===c.id).reduce((a,x)=>a+x.s,0); if(b<0){ const t=LEDGER.find(x=>x.c===c.id&&x.s>0); if(t) t.s+=Math.ceil(-b/500)*500+500; } }
  INV.forEach(v=>{ if(v.o.length) v.s=v.o.reduce((a,id)=>a+(ord(id)?ord(id).sum:0),0); });
  const ph=(label,h)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},70%,72%)"/><stop offset="1" stop-color="hsl(${h+40},70%,52%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="160" font-family="sans-serif" font-size="22" fill="white" text-anchor="middle">${label}</text></svg>`);
  const TEXTS=[
    {t:'Інструкція по оформленню замовлення',where:'info',body:'1. Оберіть продукт і розмір.\n2. Вкажіть опції, матеріал і якість друку.\n3. Натисніть на ціну в таблиці, завантажте макет і оплатіть.',photos:[{src:ph('Крок 1 — розмір',230),cap:'Вибір розміру'},{src:ph('Крок 2 — фільтр',260),cap:'Матеріал і якість'},{src:ph('Крок 3 — ціна',290),cap:'Клік по ціні'}]},
    {t:'Терміни друку',where:'info',body:'Термін рахується з моменту перевірки макета й оплати. Неділя — вихідний.',photos:[]},
    {t:'Якість друку',where:'info',body:'720 dpi — для вуличної реклами, 1440 dpi — для інтер’єру, Фото — максимальна деталізація.',photos:[{src:ph('720 dpi',200),cap:'720 dpi з відстані 3 м'},{src:ph('1440 dpi',170),cap:'1440 dpi — інтер’єр'},{src:ph('Фото',140),cap:'Фотодрук'}]},
    {t:'Ширина матеріалів та друку',where:'info',body:'Ширини рулонів і розміри листів підставляються з налаштувань матеріалів автоматично.',photos:[]},
    {t:'Зразки матеріалів з друком',where:'info',body:'Так виглядають матеріали після друку.',photos:[{src:ph('Банер 440',10),cap:'Банер 440 г/м² ламінат'},{src:ph('Плівка Oracal',30),cap:'Плівка глянцева Oracal'},{src:ph('City-light',50),cap:'Папір City-light 150'}]},
    {t:'Публічна оферта',where:'page',body:'',photos:[]},
    {t:'Умови використання',where:'page',body:'',photos:[]},
  ];
  const T=(id,list)=>{ const o=ord(id); if(o) o.thread=list; };
  T(48231,[{id:7,d:dt(0,9,41),from:'Система',t:'Замовлення №48231 прийнято. Макет передано на перевірку — зазвичай це до 30 хвилин у робочий час.'}]);
  T(48217,[{id:6,d:dt(-1,16,30),from:'Препрес',fix:true,t:'Макет stickers_v1.pdf повернено на виправлення. Текст ближче ніж 5 мм до лінії порізки; шрифти не переведені в криві. Завантажте виправлений файл або замовте доопрацювання.'},
    {d:dt(-1,16,50),from:'Клієнт',t:'А якщо відступ 3 мм — це критично?'},{id:8,d:dt(-1,17,5),from:'Препрес',read:true,t:'Так, порізка має допуск ±1,5 мм, текст може зачепити. Рекомендуємо 5 мм.'}]);
  T(48190,[{id:5,d:dt(-1,12,4),from:'Бухгалтерія',read:true,t:`Оплату ${fmt(ord(48190).sum)} грн отримано. Замовлення №48190 передано в друк.`}]);
  T(48152,[{id:4,d:dt(-1,17,50),from:'Склад',read:true,t:'Замовлення №48152 готове. Забрати можна на складі.'}]);
  T(48101,[{id:3,d:dt(-2,14,10),from:'Доставка',read:true,t:'Замовлення №48101 відправлено Новою Поштою. ТТН 20450912345678.'}]);
  T(47988,[{id:2,d:dt(-11,18,20),from:'Менеджер',read:true,arch:true,t:'Дякуємо за замовлення! Будемо раді вашому відгуку про якість друку.'}]);
  T(47911,[{id:1,d:dt(-15,9,0),from:'Система',read:true,arch:true,t:'Замовлення №47911 скасовано на ваш запит.'}]);
  Object.assign(CL.find(c=>c.id===10245),{pass:'client123',code:'3123456789',addr:'м. Київ, вул. Прикладна, 1, оф. 5',notify:{email:true,sms:false,news:false},
    recips:[{n:'Олена Коваль',ph:'+380 67 123 45 67',city:'Київ',wh:'Відділення №25'},{n:'Ігор Мельник',ph:'+380 50 765 43 21',city:'Львів',wh:'Поштомат №3105'}]});
  const bon={10245:[{d:dt(-20,10,0),t:'Вітальні бонуси за реєстрацію',s:50},{d:dt(-12,18,0),t:'Нараховано за замовлення',o:47950,s:69.32},{d:dt(-11,18,0),t:'Нараховано за замовлення',o:47988,s:35.64},
    {d:dt(-3,10,25),t:'Списано при оплаті',o:48152,s:-62.21},{d:dt(-2,18,0),t:'Нараховано за замовлення',o:48101,s:34.39},{d:dt(-1,18,0),t:'Нараховано за замовлення',o:48152,s:57.36}]};
  const tickets={10245:[{id:311,d:dt(-13,11,0),subj:'Відтінок синього на банері',o:47950,st:'Відповідь надано'},{id:298,d:dt(-30,15,0),subj:'Як підготувати макет для висічки?',st:'Закрито'}]};
  return {v:5,mig1:1,orders:ORD,clients:CL,ledger:LEDGER,inv:INV,staff:STAFF,roles:RL,texts:TEXTS,ink:INK,gen:{},bon,tickets};
}
