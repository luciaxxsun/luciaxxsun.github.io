/* =========================================================
   星光谷 · 数据表（作物 / 物品 / 村民 / 台词）
   ========================================================= */

const SEASONS = ['春', '夏', '秋', '冬'];
const SEASON_EN = ['spring', 'summer', 'autumn', 'winter'];
const DAYS_PER_SEASON = 10;
const TARGET_GOLD = 3000;

const CROPS = {
  radish:     { n: '萝卜',   season: 0, days: 3, seed: 20, sell: 45,  icon: 'carrot' },
  potato:     { n: '土豆',   season: 0, days: 4, seed: 30, sell: 75,  icon: 'ball:#c8a05a' },
  strawberry: { n: '草莓',   season: 1, days: 5, seed: 55, sell: 115, icon: 'berry', regrow: 2 },
  corn:       { n: '玉米',   season: 1, days: 6, seed: 60, sell: 145, icon: 'corn' },
  pumpkin:    { n: '南瓜',   season: 2, days: 7, seed: 70, sell: 195, icon: 'pumpkin' },
  wheat:      { n: '小麦',   season: 2, days: 4, seed: 25, sell: 62,  icon: 'wheat' },
  turnip:     { n: '冬萝卜', season: 3, days: 5, seed: 38, sell: 100, icon: 'carrot' }
};

const ITEMS = {};
for (const k in CROPS) {
  ITEMS[k + '_seed'] = { n: CROPS[k].n + '种子', kind: 'seed', crop: k, sell: Math.round(CROPS[k].seed * 0.4) };
  ITEMS[k] = { n: CROPS[k].n, kind: 'crop', sell: CROPS[k].sell };
}
Object.assign(ITEMS, {
  wood:  { n: '木材', kind: 'mat', sell: 8 },
  stone: { n: '石头', kind: 'mat', sell: 5 },
  copper:{ n: '铜矿', kind: 'mat', sell: 32 },
  fish:  { n: '小鱼', kind: 'fish', sell: 24 },
  carp:  { n: '鲤鱼', kind: 'fish', sell: 48 },
  koi:   { n: '锦鲤', kind: 'fish', sell: 110 },
  bread: { n: '面包', kind: 'food', sell: 15, buy: 30, energy: 40 }
});

/* 五种工具 */
const TOOLS = [
  { id: 'hoe',  n: '锄头', color: '#a8763f', tip: '翻地 / 播种' },
  { id: 'can',  n: '水壶', color: '#3f8fc0', tip: '浇水' },
  { id: 'axe',  n: '斧头', color: '#9a9a9a', tip: '砍树' },
  { id: 'pick', n: '镐',   color: '#b0b0b0', tip: '敲石头' },
  { id: 'rod',  n: '鱼竿', color: '#7a9a5a', tip: '在池塘钓鱼' }
];

/* 村民 */
const NPCS = [
  {
    id: 'zhang', name: '张伯', img: 'zhang',
    spawn: [46, 11], area: [41, 48, 9, 15], likes: ['pumpkin', 'corn', 'bread', 'potato'],
    lines: [
      ['新来的？我是张伯，这店开了三十年咯。', '地要天天浇水，庄稼才长得快。', '钱不够就来卖菜，我这儿什么都收。'],
      ['你这农场有点样子了。', '我年轻时也种地，后来腰不行就开店啦。', '南瓜最值钱，信我。'],
      ['你比我年轻时能干多了。', '有空来店里喝口茶，别客气。', '这山谷有你，热闹了不少。']
    ]
  },
  {
    id: 'mei', name: '小美', img: 'mei',
    spawn: [32, 19], area: [26, 37, 15, 22], likes: ['strawberry', 'koi', 'radish'],
    lines: [
      ['你好呀！我叫小美，住在那边的红屋顶。', '你种的草莓什么时候熟？我最喜欢草莓啦。', '池塘边的花开了，你去看过没有？'],
      ['今天风吹得真舒服。', '我在学做果酱，等我学会了送你一瓶。', '你每天都来跟我说话，真好。'],
      ['你一来，这一天就亮起来了。', '这个给你——我采的花，别嫌土。', '记得吃饭呀，别光顾着种地。']
    ]
  },
  {
    id: 'mu', name: '阿木', img: 'mu',
    spawn: [40, 25], area: [34, 45, 22, 31], likes: ['fish', 'carp', 'koi', 'copper'],
    lines: [
      ['……哦，是你。', '鱼要等它咬钩，急不得。', '石头下面常有铜矿，你敲开看看。'],
      ['我在池边坐了一下午，钓到一条锦鲤。', '你挖矿的样子挺像样。', '雨天鱼最好钓。'],
      ['给你个东西，我钓多了。', '你要是累了，来这儿坐着，什么都不用说。', '我认得你的脚步声了。']
    ]
  }
];

const GIFT_LIKED = ['谢谢你！这个我正喜欢。', '哇，你记得我喜欢什么。'];
const GIFT_NEUTRAL = ['嗯……这个我用得上，谢啦。', '谢谢，收下了。'];
const SLEEP_LINES = [
  '今天也辛苦了，晚安。',
  '躺下的一瞬间，一天的累都散了。',
  '明天又是新的一天。'
];
