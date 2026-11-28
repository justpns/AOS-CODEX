export const NAVIGATION = [
  ['OVERVIEW', [['dashboard','Dashboard','◈'],['configuration','Global Configuration','⚙'],['versions','Balance Project Versions','▣']]],
  ['COMBAT BALANCE', [['power','Player Power Curve','⌁'],['normal','Normal Monster Balance','◉'],['mvp','MVP Boss Balance','♜'],['abyss','Abyss Boss Balance','♜'],['ttk','TTK Simulator','◷'],['profiles','Combat Profiles','♧']]],
  ['REWARD ECONOMY', [['rewards','Monster Rewards','◇'],['farming','Farming Efficiency','⌖'],['maps','Map Efficiency','⌂'],['boss-rewards','Boss Reward Efficiency','♜'],['gold','Gold Economy','◈']]],
  ['PROGRESSION', [['base-exp','Base EXP Table','↗'],['class1-exp','Class 1 Job EXP Table','↗'],['class2-exp','Class 2 Job EXP Table','↗'],['multi-client','Multi-client Simulation','▤'],['comparison','Player Progression Comparison','◫'],['battlepass','Battle Pass Lifecycle','▤']]],
  ['ANALYSIS', [['impact','Before / After Comparison','⇄'],['impact-analysis','Balance Impact Analysis','⌁'],['stress','Stress Test','⚡'],['validation','Validation Center','✓']]],
  ['DATA MANAGEMENT', [['database','Monster Database','▦'],['import-export','Import / Export','⇧'],['history','Change History','◴'],['handoff','Production Handoff','▣']]]
];
export const PAGE_NAMES = Object.fromEntries(NAVIGATION.flatMap(([_, entries]) => entries.map(([id, name]) => [id, name])));
