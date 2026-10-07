// =====================================================================
//  Base de données : cépages, régions, appellations (France + pièges)
//  Format appellation : "Nom|code région|couleurs|cépages principaux"
//  Couleurs : R rouge · B blanc · P rosé · E effervescent · D doux/liquoreux/VDN
// =====================================================================

// ---- Cépages : clé -> [nom, couleur (r/b), alias...]
const G = {
  // Rouges
  cs:['Cabernet Sauvignon','r'], cf:['Cabernet Franc','r','Breton','Bouchet'], me:['Merlot','r'],
  pv:['Petit Verdot','r'], mal:['Malbec','r','Côt','Cot'], car:['Carménère','r'],
  pn:['Pinot Noir','r','Spätburgunder'], meu:['Pinot Meunier','r','Meunier'], ga:['Gamay','r'],
  sy:['Syrah','r','Shiraz'], gr:['Grenache','r','Grenache Noir','Garnacha','Cannonau'],
  mo:['Mourvèdre','r','Monastrell','Mataro'], ci:['Cinsault','r','Cinsaut'],
  ca:['Carignan','r','Mazuelo','Cariñena'], cou:['Counoise','r'], vac:['Vaccarèse','r'],
  mus:['Muscardin','r'], tn:['Terret Noir','r'], tan:['Tannat','r'],
  fer:['Fer Servadou','r','Braucol','Mansois','Pinenc'], neg:['Négrette','r'], dur:['Duras','r'],
  pru:['Prunelard','r'], abo:['Abouriou','r'], mn:['Manseng Noir','r'], tro:['Trousseau','r'],
  pou:['Poulsard','r','Ploussard'], mon:['Mondeuse','r'], per:['Persan','r'],
  pda:["Pineau d'Aunis",'r','Chenin Noir'], grol:['Grolleau','r','Groslot'],
  nie:['Nielluccio','r'], sci:['Sciaccarello','r','Sciaccarellu'], tib:['Tibouren','r'],
  bra:['Braquet','r'], fol:['Folle Noire','r','Fuella'], msl:['Marselan','r'], cal:['Caladoc','r'],
  abou:['Alicante Bouschet','r'], ces:['César','r'], lle:['Lledoner Pelut','r'],
  // Rouges étrangers
  tem:['Tempranillo','r','Tinto Fino','Tinta Roriz','Aragonez','Tinta del País'],
  grac:['Graciano','r'], neb:['Nebbiolo','r'], san:['Sangiovese','r','Brunello'],
  cor:['Corvina','r'], barb:['Barbera','r'], nma:['Nerello Mascalese','r'],
  tna:['Touriga Nacional','r'], tfr:['Touriga Franca','r'], zin:['Zinfandel','r','Primitivo'],
  pino:['Pinotage','r'], agl:['Aglianico','r'], nda:["Nero d'Avola",'r'], mpu:['Montepulciano','r'],
  dol:['Dolcetto','r'], blau:['Blaufränkisch','r','Lemberger'], zw:['Zweigelt','r'],
  // Blancs
  ch:['Chardonnay','b','Beaunois'], sb:['Sauvignon Blanc','b','Sauvignon','Blanc Fumé'],
  sg:['Sauvignon Gris','b'], se:['Sémillon','b'], mu:['Muscadelle','b'],
  che:['Chenin Blanc','b','Chenin','Pineau de la Loire'], mel:['Melon de Bourgogne','b','Melon'],
  fb:['Folle Blanche','b','Gros Plant'], ri:['Riesling','b'], gw:['Gewurztraminer','b','Traminer'],
  pg:['Pinot Gris','b','Malvoisie','Grauburgunder','Pinot Grigio'], pb:['Pinot Blanc','b','Weissburgunder'],
  aux:['Auxerrois','b'], syl:['Sylvaner','b','Silvaner'],
  mpg:['Muscat à Petits Grains','b','Muscat Blanc','Muscat de Frontignan'],
  mda:["Muscat d'Alexandrie",'b'], mot:['Muscat Ottonel','b'],
  vio:['Viognier','b'], mar:['Marsanne','b'], rsn:['Roussanne','b','Bergeron'],
  grb:['Grenache Blanc','b'], grg:['Grenache Gris','b'], cla:['Clairette','b'],
  bou:['Bourboulenc','b'], pic:['Picpoul','b','Piquepoul'], pcd:['Picardan','b'],
  ver:['Vermentino','b','Rolle'], ugn:['Ugni Blanc','b','Trebbiano'],
  mac:['Macabeu','b','Macabeo','Viura'], tou:['Tourbat','b','Malvoisie du Roussillon'],
  mau:['Mauzac','b'], len:["Len de l'El",'b',"Loin de l'Œil"], ond:['Ondenc','b'],
  col:['Colombard','b'], gmg:['Gros Manseng','b'], pmg:['Petit Manseng','b'],
  pcou:['Petit Courbu','b','Courbu'], arr:['Arrufiac','b'], baq:['Baroque','b'],
  sav:['Savagnin','b','Naturé'], jac:['Jacquère','b'], alt:['Altesse','b','Roussette'],
  chs:['Chasselas','b','Fendant'], gri:['Gringet','b'], mol:['Molette','b'],
  alig:['Aligoté','b'], sac:['Sacy','b'], rom:['Romorantin','b'],
  arb:['Arbane','b'], pme:['Petit Meslier','b'], orb:['Orbois','b','Menu Pineau','Arbois'],
  tre:['Tressallier','b'], bia:['Biancu Gentile','b'],
  // Blancs étrangers
  albr:['Albariño','b','Alvarinho'], verd:['Verdejo','b'], xar:['Xarel·lo','b','Xarello'],
  par:['Parellada','b'], pal:['Palomino','b'], gv:['Grüner Veltliner','b'], fur:['Furmint','b'],
  tor:['Torrontés','b'], garg:['Garganega','b'], gle:['Glera','b','Prosecco'],
  ass:['Assyrtiko','b'], fia:['Fiano','b'], god:['Godello','b'], cort:['Cortese','b'],
};

export const REGIONS_FR = ['Alsace','Beaujolais','Bordeaux','Bourgogne','Champagne','Corse','Jura',
  'Languedoc','Lorraine','Provence','Roussillon','Savoie-Bugey','Sud-Ouest','Vallée de la Loire',
  'Vallée du Rhône','Vin de France'];
export const REGIONS_WORLD = ['Afrique du Sud','Allemagne','Argentine','Australie','Autriche','Chili',
  'Espagne','États-Unis','Grèce','Hongrie','Italie','Nouvelle-Zélande','Portugal','Suisse'];
export const REGIONS = [...REGIONS_FR, ...REGIONS_WORLD];

const RC = { A:'Alsace', BJ:'Beaujolais', BX:'Bordeaux', BG:'Bourgogne', CH:'Champagne', CO:'Corse',
  JU:'Jura', LA:'Languedoc', LO:'Lorraine', PR:'Provence', RO:'Roussillon', SA:'Savoie-Bugey',
  SO:'Sud-Ouest', LR:'Vallée de la Loire', RH:'Vallée du Rhône', VF:'Vin de France',
  ZA:'Afrique du Sud', DE:'Allemagne', AR:'Argentine', AU:'Australie', AT:'Autriche', CL:'Chili',
  ES:'Espagne', US:'États-Unis', GR:'Grèce', HU:'Hongrie', IT:'Italie', NZ:'Nouvelle-Zélande',
  PT:'Portugal', CHS:'Suisse' };

const RAW = `
Alsace|A|BRP|ri,gw,pg,mpg,syl,pb,aux,chs,pn
Crémant d'Alsace|A|E|pb,aux,ri,pg,pn,ch
Alsace Grand Cru|A|BD|ri,gw,pg,mpg
Vendanges Tardives (Alsace)|A|D|gw,pg,ri,mpg
Sélection de Grains Nobles (Alsace)|A|D|gw,pg,ri
Côtes de Toul|LO|RBP|ga,pn,aux
Moselle|LO|RBP|aux,pb,pg,ri,gw,pn
Champagne|CH|E|pn,meu,ch,pb,arb,pme
Coteaux Champenois|CH|RB|pn,meu,ch
Rosé des Riceys|CH|P|pn
Bourgogne|BG|RBP|pn,ch,ga
Bourgogne Aligoté|BG|B|alig
Bouzeron|BG|B|alig
Coteaux Bourguignons|BG|RBP|ga,pn,ch,alig
Bourgogne Passe-Tout-Grains|BG|RP|ga,pn
Crémant de Bourgogne|BG|E|pn,ch,ga,alig,pb
Bourgogne Hautes-Côtes de Nuits|BG|RBP|pn,ch
Bourgogne Hautes-Côtes de Beaune|BG|RBP|pn,ch
Bourgogne Côte Chalonnaise|BG|RBP|pn,ch
Bourgogne Côte d'Or|BG|RB|pn,ch
Bourgogne Tonnerre|BG|B|ch
Bourgogne Épineuil|BG|RP|pn
Bourgogne Chitry|BG|RB|pn,ch
Bourgogne Coulanges-la-Vineuse|BG|RB|pn,ch
Irancy|BG|R|pn,ces
Saint-Bris|BG|B|sb,sg
Vézelay|BG|B|ch
Petit Chablis|BG|B|ch
Chablis|BG|B|ch
Chablis Premier Cru|BG|B|ch
Chablis Grand Cru|BG|B|ch
Marsannay|BG|RBP|pn,ch
Fixin|BG|RB|pn,ch
Gevrey-Chambertin|BG|R|pn
Morey-Saint-Denis|BG|RB|pn,ch
Chambolle-Musigny|BG|R|pn
Vougeot|BG|RB|pn,ch
Vosne-Romanée|BG|R|pn
Nuits-Saint-Georges|BG|RB|pn,ch
Côte de Nuits-Villages|BG|RB|pn,ch
Ladoix|BG|RB|pn,ch
Aloxe-Corton|BG|RB|pn,ch
Pernand-Vergelesses|BG|RB|pn,ch
Savigny-lès-Beaune|BG|RB|pn,ch
Chorey-lès-Beaune|BG|RB|pn,ch
Beaune|BG|RB|pn,ch
Côte de Beaune|BG|RB|pn,ch
Côte de Beaune-Villages|BG|R|pn
Pommard|BG|R|pn
Volnay|BG|R|pn
Monthélie|BG|RB|pn,ch
Auxey-Duresses|BG|RB|pn,ch
Saint-Romain|BG|RB|ch,pn
Meursault|BG|BR|ch,pn
Blagny|BG|R|pn
Puligny-Montrachet|BG|BR|ch,pn
Chassagne-Montrachet|BG|BR|ch,pn
Saint-Aubin|BG|BR|ch,pn
Santenay|BG|RB|pn,ch
Maranges|BG|RB|pn,ch
Rully|BG|BR|ch,pn
Mercurey|BG|RB|pn,ch
Givry|BG|RB|pn,ch
Montagny|BG|B|ch
Mâcon|BG|RBP|ch,ga,pn
Mâcon-Villages|BG|B|ch
Viré-Clessé|BG|B|ch
Pouilly-Fuissé|BG|B|ch
Pouilly-Loché|BG|B|ch
Pouilly-Vinzelles|BG|B|ch
Saint-Véran|BG|B|ch
Chambertin|BG|R|pn
Chambertin-Clos de Bèze|BG|R|pn
Chapelle-Chambertin|BG|R|pn
Charmes-Chambertin|BG|R|pn
Griotte-Chambertin|BG|R|pn
Latricières-Chambertin|BG|R|pn
Mazis-Chambertin|BG|R|pn
Mazoyères-Chambertin|BG|R|pn
Ruchottes-Chambertin|BG|R|pn
Clos de la Roche|BG|R|pn
Clos Saint-Denis|BG|R|pn
Clos des Lambrays|BG|R|pn
Clos de Tart|BG|R|pn
Bonnes-Mares|BG|R|pn
Musigny|BG|RB|pn,ch
Clos de Vougeot|BG|R|pn
Échezeaux|BG|R|pn
Grands-Échezeaux|BG|R|pn
Richebourg|BG|R|pn
Romanée-Conti|BG|R|pn
La Romanée|BG|R|pn
Romanée-Saint-Vivant|BG|R|pn
La Tâche|BG|R|pn
La Grande Rue|BG|R|pn
Corton|BG|RB|pn,ch
Corton-Charlemagne|BG|B|ch
Charlemagne|BG|B|ch
Montrachet|BG|B|ch
Chevalier-Montrachet|BG|B|ch
Bâtard-Montrachet|BG|B|ch
Bienvenues-Bâtard-Montrachet|BG|B|ch
Criots-Bâtard-Montrachet|BG|B|ch
Beaujolais|BJ|RBP|ga,ch
Beaujolais-Villages|BJ|RBP|ga,ch
Brouilly|BJ|R|ga
Côte de Brouilly|BJ|R|ga
Chénas|BJ|R|ga
Chiroubles|BJ|R|ga
Fleurie|BJ|R|ga
Juliénas|BJ|R|ga
Morgon|BJ|R|ga
Moulin-à-Vent|BJ|R|ga
Régnié|BJ|R|ga
Saint-Amour|BJ|R|ga
Coteaux du Lyonnais|BJ|RBP|ga,ch,alig
Arbois|JU|RBP|sav,ch,pou,tro,pn
Arbois-Pupillin|JU|RB|pou,sav,ch,tro,pn
Côtes du Jura|JU|RBP|ch,sav,pou,tro,pn
L'Étoile|JU|B|ch,sav,pou
Château-Chalon|JU|B|sav
Vin Jaune (Jura)|JU|B|sav
Vin de Paille (Jura)|JU|D|ch,sav,pou,tro
Crémant du Jura|JU|E|ch,pn,pou,tro,sav
Macvin du Jura|JU|D|ch,sav,pou,tro,pn
Vin de Savoie|SA|RBPE|jac,alt,chs,mon,ga,pn,per,rsn,gri
Vin de Savoie Apremont|SA|B|jac
Vin de Savoie Abymes|SA|B|jac
Vin de Savoie Chignin|SA|BR|jac,mon,ga,pn
Vin de Savoie Chignin-Bergeron|SA|B|rsn
Vin de Savoie Arbin|SA|R|mon
Vin de Savoie Saint-Jean-de-la-Porte|SA|R|mon
Vin de Savoie Jongieux|SA|BR|jac,ga,mon
Vin de Savoie Ayze|SA|BE|gri
Vin de Savoie Crépy|SA|B|chs
Vin de Savoie Marignan|SA|B|chs
Vin de Savoie Ripaille|SA|B|chs
Vin de Savoie Marin|SA|B|chs
Roussette de Savoie|SA|B|alt
Seyssel|SA|BE|alt,mol,chs
Crémant de Savoie|SA|E|jac,alt,ch
Bugey|SA|RBPE|ga,pn,mon,ch,alt,alig
Bugey Cerdon|SA|E|ga,pou
Bugey Montagnieu|SA|ER|alt,ch,mon
Bugey Manicle|SA|RB|ch,pn
Roussette du Bugey|SA|B|alt,ch
Muscadet|LR|B|mel
Muscadet Sèvre et Maine|LR|B|mel
Muscadet Coteaux de la Loire|LR|B|mel
Muscadet Côtes de Grandlieu|LR|B|mel
Gros Plant du Pays Nantais|LR|B|fb
Coteaux d'Ancenis|LR|RBP|ga,cf,cs,pg
Fiefs Vendéens|LR|RBP|pn,ga,cf,che,ch,grol
Anjou|LR|RBE|che,cf,cs,pda
Anjou Villages|LR|R|cf,cs
Anjou Villages Brissac|LR|R|cf,cs
Anjou Gamay|LR|R|ga
Rosé d'Anjou|LR|P|grol,cf,cs,ga,pda,mal
Cabernet d'Anjou|LR|P|cf,cs
Rosé de Loire|LR|P|cf,cs,grol,ga,pda,pn
Crémant de Loire|LR|E|che,ch,cf,pn,grol,cs,pda
Savennières|LR|B|che
Savennières Roche-aux-Moines|LR|B|che
Coulée de Serrant|LR|B|che
Coteaux du Layon|LR|D|che
Quarts de Chaume|LR|D|che
Bonnezeaux|LR|D|che
Coteaux de l'Aubance|LR|D|che
Anjou Coteaux de la Loire|LR|D|che
Saumur|LR|RBPE|che,cf,ch,cs,pda
Saumur-Champigny|LR|R|cf,cs,pda
Saumur Puy-Notre-Dame|LR|R|cf,cs
Coteaux de Saumur|LR|D|che
Chinon|LR|RBP|cf,cs,che
Bourgueil|LR|RP|cf,cs
Saint-Nicolas-de-Bourgueil|LR|RP|cf,cs
Vouvray|LR|BED|che,orb
Montlouis-sur-Loire|LR|BED|che
Touraine|LR|RBPE|sb,ga,cf,mal,che,pda,grol,sg
Touraine Amboise|LR|RBP|mal,cf,ga,che
Touraine Azay-le-Rideau|LR|BP|che,grol
Touraine Chenonceaux|LR|RB|sb,mal,cf
Touraine Mesland|LR|RBP|ga,cf,mal,che,sb
Touraine Oisly|LR|B|sb
Touraine Noble Joué|LR|P|meu,pg,pn
Cheverny|LR|RBP|sb,ch,pn,ga,mal
Cour-Cheverny|LR|B|rom
Valençay|LR|RBP|sb,ch,ga,mal,pn
Jasnières|LR|B|che
Coteaux du Loir|LR|RBP|pda,che,ga,cf,mal
Coteaux du Vendômois|LR|RBP|pda,che,ch,pn,cf
Orléans|LR|RBP|meu,pn,ch
Orléans-Cléry|LR|R|cf
Sancerre|LR|BRP|sb,pn
Pouilly-Fumé|LR|B|sb
Pouilly-sur-Loire|LR|B|chs
Menetou-Salon|LR|BRP|sb,pn
Quincy|LR|B|sb,sg
Reuilly|LR|BRP|sb,pn,pg
Coteaux du Giennois|LR|BRP|sb,pn,ga
Châteaumeillant|LR|RP|ga,pn,pg
Haut-Poitou|LR|RBP|sb,cf,cs,ga,me
Saint-Pourçain|LR|RBP|tre,ch,sb,ga,pn
Côte Roannaise|LR|RP|ga
Côtes du Forez|LR|RP|ga
Côtes d'Auvergne|LR|RBP|ga,pn,ch
IGP Val de Loire|LR|RBP|sb,ch,che,cf,ga,mel,grol
Côte-Rôtie|RH|R|sy,vio
Condrieu|RH|BD|vio
Château-Grillet|RH|B|vio
Saint-Joseph|RH|RB|sy,mar,rsn
Crozes-Hermitage|RH|RB|sy,mar,rsn
Hermitage|RH|RBD|sy,mar,rsn
Cornas|RH|R|sy
Saint-Péray|RH|BE|mar,rsn
Clairette de Die|RH|E|mpg,cla
Crémant de Die|RH|E|cla,alig,mpg
Châtillon-en-Diois|RH|RBP|ga,sy,pn,alig,ch
Coteaux de Die|RH|B|cla
Côtes du Rhône|RH|RBP|gr,sy,mo,ci,ca,cla,grb,mar,rsn,bou,vio
Côtes du Rhône Villages|RH|RBP|gr,sy,mo,ci,ca,grb,cla,rsn,bou,vio
Châteauneuf-du-Pape|RH|RB|gr,sy,mo,ci,cou,vac,mus,tn,cla,bou,grb,rsn,pic,pcd
Gigondas|RH|RP|gr,sy,mo,ci
Vacqueyras|RH|RBP|gr,sy,mo,cla,grb,bou,rsn
Rasteau|RH|RD|gr,sy,mo
Cairanne|RH|RB|gr,sy,mo,cla,grb,rsn
Vinsobres|RH|R|gr,sy,mo
Beaumes-de-Venise|RH|R|gr,sy,mo
Muscat de Beaumes-de-Venise|RH|D|mpg
Lirac|RH|RBP|gr,sy,mo,ci,cla,grb,bou
Tavel|RH|P|gr,ci,ca,mo,sy,cla,bou,pic
Duché d'Uzès|RH|RBP|gr,sy,vio,grb,mar,rsn
Costières de Nîmes|RH|RBP|gr,sy,mo,ca,ci,grb,rsn,mar
Clairette de Bellegarde|RH|B|cla
Ventoux|RH|RBP|gr,sy,ci,ca,mo,cla,grb,bou
Luberon|RH|RBP|gr,sy,ver,grb,cla,rsn
Grignan-les-Adhémar|RH|RBP|gr,sy,vio,mar
Côtes du Vivarais|RH|RBP|gr,sy,mo,ci
IGP Collines Rhodaniennes|RH|RB|sy,vio,ga,mar
IGP Ardèche|RH|RBP|sy,vio,ga,ch,mar
IGP Vaucluse|RH|RBP|gr,sy,mo,ci
Côtes de Provence|PR|PRB|gr,ci,sy,mo,tib,ca,ver,cla,ugn,se
Côtes de Provence Sainte-Victoire|PR|PR|gr,ci,sy
Côtes de Provence Fréjus|PR|PR|gr,ci,tib,mo,sy
Côtes de Provence La Londe|PR|PRB|gr,ci,mo,ver
Côtes de Provence Pierrefeu|PR|PR|gr,ci,sy
Côtes de Provence Notre-Dame des Anges|PR|PR|gr,ci,sy
Coteaux d'Aix-en-Provence|PR|PRB|gr,ci,sy,cs,mo,ca,ver,cla
Coteaux Varois en Provence|PR|PRB|gr,ci,sy,mo,ver
Bandol|PR|RPB|mo,gr,ci,cla,ugn,bou
Cassis|PR|BRP|mar,cla,ugn,ver,ci,gr,mo
Bellet|PR|RBP|bra,fol,ver
Palette|PR|RBP|mo,gr,ci,cla
Les Baux-de-Provence|PR|RPB|gr,sy,ci,cs,mo,ver,cla
Pierrevert|PR|RBP|gr,sy,ci,ver,rsn
IGP Méditerranée|PR|RBP|gr,sy,ci,me,cs,ver
Corse|CO|RPB|nie,sci,gr,ver
Corse Calvi|CO|RPB|nie,sci,gr,ver
Corse Sartène|CO|RPB|sci,gr,ver
Corse Figari|CO|RPB|nie,sci,ver
Corse Porto-Vecchio|CO|RPB|nie,sci,ver
Corse Coteaux du Cap Corse|CO|RB|ver,nie
Ajaccio|CO|RPB|sci,gr,ver
Patrimonio|CO|RPB|nie,ver
Muscat du Cap Corse|CO|D|mpg
IGP Île de Beauté|CO|RPB|nie,sci,ver,bia,me,cs
Languedoc|LA|RPB|gr,sy,mo,ca,ci,grb,bou,cla,pic,ver,mar,rsn,vio
Pic Saint-Loup|LA|RPB|sy,gr,mo
Terrasses du Larzac|LA|R|sy,gr,mo,ca,ci
Faugères|LA|RPB|sy,gr,mo,ca,ci,rsn,mar
Saint-Chinian|LA|RPB|sy,gr,mo,ca,ci
Saint-Chinian Berlou|LA|R|ca,sy,gr
Saint-Chinian Roquebrun|LA|R|sy,gr,mo
Minervois|LA|RPB|sy,gr,mo,ca,ci
La Livinière|LA|R|sy,gr,mo,ca
Corbières|LA|RPB|ca,gr,sy,mo,ci
Corbières-Boutenac|LA|R|ca,gr,sy,mo
Fitou|LA|R|ca,gr,sy,mo
Cabardès|LA|RP|me,cs,sy,gr,cf
Malepère|LA|RP|me,cf,cs
Limoux|LA|RB|ch,che,mau,me,pn
Blanquette de Limoux|LA|E|mau,ch,che
Crémant de Limoux|LA|E|ch,che,mau,pn
Clairette du Languedoc|LA|B|cla
Picpoul de Pinet|LA|B|pic
La Clape|LA|RB|bou,gr,sy,mo,ca
Pézenas|LA|R|sy,gr,mo
Grès de Montpellier|LA|R|sy,gr,mo
Muscat de Frontignan|LA|D|mpg
Muscat de Lunel|LA|D|mpg
Muscat de Mireval|LA|D|mpg
Muscat de Saint-Jean-de-Minervois|LA|D|mpg
IGP Pays d'Oc|LA|RPB|me,cs,sy,gr,ch,sb,vio,pn,ca,msl
IGP Cévennes|LA|RPB|sy,gr,me,ch,vio
Côtes du Roussillon|RO|RPB|gr,sy,mo,ca,lle,mac,grb,grg,ver,tou
Côtes du Roussillon Villages|RO|R|gr,sy,mo,ca
Côtes du Roussillon Villages Caramany|RO|R|ca,gr,sy
Côtes du Roussillon Villages Latour-de-France|RO|R|ca,gr,sy,mo
Côtes du Roussillon Villages Lesquerde|RO|R|ca,gr,sy
Côtes du Roussillon Villages Tautavel|RO|R|gr,ca,sy,mo
Côtes du Roussillon Les Aspres|RO|R|sy,gr,mo,ca
Collioure|RO|RPB|gr,mo,sy,ca,grg,grb
Banyuls|RO|D|gr,grg,grb
Banyuls Grand Cru|RO|D|gr
Maury|RO|RD|gr,grg,grb,ca,sy,mo
Rivesaltes|RO|D|gr,grg,grb,mac,tou
Muscat de Rivesaltes|RO|D|mpg,mda
IGP Côtes Catalanes|RO|RPB|gr,ca,sy,mac,grg,grb,mda
Bergerac|SO|RPB|me,cs,cf,mal,se,sb,mu
Côtes de Bergerac|SO|RBD|me,cs,cf,se
Pécharmant|SO|R|me,cf,cs,mal
Monbazillac|SO|D|se,sb,mu
Saussignac|SO|D|se,sb,mu,che
Montravel|SO|BR|se,sb,mu,me
Côtes de Montravel|SO|D|se,sb,mu
Haut-Montravel|SO|D|se,sb,mu
Rosette|SO|D|se,sb,mu
Côtes de Duras|SO|RPBD|me,cs,cf,mal,sb,se,mu
Côtes du Marmandais|SO|RPB|me,cf,cs,abo,sy,mal,fer
Buzet|SO|RPB|me,cs,cf,mal
Brulhois|SO|RP|tan,me,cs,cf,mal
Cahors|SO|R|mal,me,tan
Coteaux du Quercy|SO|RP|cf,mal,me,tan,ga
Fronton|SO|RP|neg,sy,cf,cs,ga
Saint-Sardos|SO|RP|sy,tan,me,cf
Gaillac|SO|RPBED|dur,fer,sy,pru,ga,mau,len,ond,mu,sb
Marcillac|SO|RP|fer
Entraygues-Le Fel|SO|RPB|fer,cf,che
Estaing|SO|RPB|fer,ga,che
Côtes de Millau|SO|RPB|ga,sy,fer,che,mau
Madiran|SO|R|tan,cf,cs,fer
Pacherenc du Vic-Bilh|SO|BD|pmg,gmg,pcou,arr
Saint-Mont|SO|RPB|tan,pru,fer,mn,cs,cf,gmg,pmg,pcou,arr
Tursan|SO|RPB|tan,cf,cs,baq,gmg,pmg
Béarn|SO|RPB|tan,cf,cs,mn,pmg,gmg,pcou
Jurançon|SO|BD|pmg,gmg,pcou
Irouléguy|SO|RPB|tan,cf,cs,gmg,pmg,pcou
Floc de Gascogne|SO|D|col,ugn,gmg,tan,me
IGP Côtes de Gascogne|SO|BRP|col,ugn,gmg,pmg,sb,me,tan,cs
IGP Comté Tolosan|SO|RBP|me,cs,cf,tan,mal,gmg,sb
Bordeaux|BX|RBP|me,cs,cf,mal,pv,car,se,sb,mu,sg
Bordeaux Supérieur|BX|RB|me,cs,cf,mal,pv
Bordeaux Clairet|BX|P|me,cs,cf
Bordeaux Rosé|BX|P|me,cs,cf
Crémant de Bordeaux|BX|E|se,sb,mu,cf,cs,me
Entre-Deux-Mers|BX|B|sb,se,mu,sg
Entre-Deux-Mers Haut-Benauge|BX|B|se,sb,mu
Graves|BX|RB|cs,me,cf,se,sb,mu
Graves Supérieures|BX|D|se,sb,mu
Pessac-Léognan|BX|RB|cs,me,cf,se,sb
Sauternes|BX|D|se,sb,mu
Barsac|BX|D|se,sb,mu
Cérons|BX|D|se,sb,mu
Loupiac|BX|D|se,sb,mu
Cadillac|BX|D|se,sb,mu
Sainte-Croix-du-Mont|BX|D|se,sb,mu
Premières Côtes de Bordeaux|BX|D|se,sb,mu
Bordeaux Haut-Benauge|BX|BD|se,sb,mu
Côtes de Bordeaux-Saint-Macaire|BX|BD|se,sb,mu
Médoc|BX|R|cs,me,cf,pv,mal
Haut-Médoc|BX|R|cs,me,cf,pv
Margaux|BX|R|cs,me,cf,pv
Pauillac|BX|R|cs,me,cf,pv
Saint-Julien|BX|R|cs,me,cf,pv
Saint-Estèphe|BX|R|cs,me,cf,pv
Listrac-Médoc|BX|R|me,cs,cf,pv
Moulis-en-Médoc|BX|R|me,cs,cf,pv
Saint-Émilion|BX|R|me,cf,cs
Saint-Émilion Grand Cru|BX|R|me,cf,cs
Montagne-Saint-Émilion|BX|R|me,cf,cs
Lussac-Saint-Émilion|BX|R|me,cf,cs
Puisseguin-Saint-Émilion|BX|R|me,cf,cs
Saint-Georges-Saint-Émilion|BX|R|me,cf,cs
Pomerol|BX|R|me,cf,cs
Lalande-de-Pomerol|BX|R|me,cf,cs
Fronsac|BX|R|me,cf,cs,mal
Canon-Fronsac|BX|R|me,cf,cs,mal
Côtes de Bourg|BX|RB|me,cs,cf,mal,se,sb
Blaye|BX|R|me,cs,cf,mal
Blaye Côtes de Bordeaux|BX|RB|me,cs,cf,mal,sb,se
Côtes de Bordeaux|BX|R|me,cs,cf
Cadillac Côtes de Bordeaux|BX|R|me,cs,cf
Castillon Côtes de Bordeaux|BX|R|me,cf,cs
Francs Côtes de Bordeaux|BX|RB|me,cf,cs,se,sb
Sainte-Foy Côtes de Bordeaux|BX|RBD|me,cs,cf,se,sb
Graves de Vayres|BX|RB|me,cs,cf,se,sb
IGP Atlantique|BX|RBP|me,cs,cf,sb,ch,col
Vin de France|VF|RBPE|me,cs,sy,gr,pn,ga,ch,sb,che,vio,ca,mal
Rioja|ES|RBP|tem,gr,grac,ca,mac
Ribera del Duero|ES|R|tem,cs,me
Priorat|ES|R|gr,ca,sy,cs
Toro|ES|R|tem
Rías Baixas|ES|B|albr
Rueda|ES|B|verd,sb
Valdeorras|ES|B|god
Cava|ES|E|mac,xar,par,ch
Jerez|ES|D|pal
Barolo|IT|R|neb
Barbaresco|IT|R|neb
Barbera d'Asti|IT|R|barb
Gavi|IT|B|cort
Chianti Classico|IT|R|san
Brunello di Montalcino|IT|R|san
Bolgheri|IT|R|cs,me,cf,sy
Amarone della Valpolicella|IT|R|cor
Soave|IT|B|garg
Prosecco|IT|E|gle
Etna|IT|RB|nma
Taurasi|IT|R|agl
Mosel|DE|B|ri
Rheingau|DE|B|ri
Pfalz|DE|BR|ri,pn
Wachau|AT|B|gv,ri
Burgenland|AT|R|blau,zw
Tokaj|HU|D|fur
Douro|PT|RB|tna,tfr,tem
Porto|PT|D|tna,tfr,tem
Vinho Verde|PT|B|albr
Napa Valley|US|RB|cs,me,ch,zin
Sonoma|US|RB|pn,ch,zin
Willamette Valley|US|R|pn
Marlborough|NZ|B|sb,pn
Central Otago|NZ|R|pn
Mendoza|AR|R|mal
Salta|AR|B|tor
Maipo|CL|R|cs,car
Barossa Valley|AU|R|sy,gr
Margaret River|AU|RB|cs,ch
Stellenbosch|ZA|RB|cs,pino,che
Valais|CHS|RB|chs,pn,ga
Santorin|GR|B|ass
`;

// Alsace : les 51 grands crus
const ALSACE_GC = ['Altenberg de Bergbieten','Altenberg de Bergheim','Altenberg de Wolxheim','Brand',
  'Bruderthal','Eichberg','Engelberg','Florimont','Frankstein','Froehn','Furstentum','Geisberg',
  'Gloeckelberg','Goldert','Hatschbourg','Hengst','Kaefferkopf','Kanzlerberg','Kastelberg','Kessler',
  'Kirchberg de Barr','Kirchberg de Ribeauvillé','Kitterlé','Mambourg','Mandelberg','Marckrain',
  'Moenchberg','Muenchberg','Ollwiller','Osterberg','Pfersigberg','Pfingstberg','Praelatenberg',
  'Rangen','Rosacker','Saering','Schlossberg','Schoenenbourg','Sommerberg','Sonnenglanz','Spiegel',
  'Sporen','Steinert','Steingrubler','Steinklotz','Vorbourg','Wiebelsberg','Wineck-Schlossberg',
  'Winzenberg','Zinnkoepflé','Zotzenberg'];

// Côtes du Rhône Villages avec nom géographique
const CDRV = ['Plan de Dieu','Séguret','Sablet','Visan','Valréas','Massif d\'Uchaux','Signargues',
  'Laudun','Chusclan','Saint-Gervais','Roaix','Rochegude','Saint-Maurice','Suze-la-Rousse',
  'Sainte-Cécile','Vaison-la-Romaine','Puyméras','Gadagne','Nyons','Saint-Andéol',
  'Saint-Pantaléon-les-Vignes','Rousset-les-Vignes','Valréas','Vaison-la-Romaine'];

// ---------------------------------------------------------------------
export const GRAPES = Object.entries(G).map(([k, [n, c, ...alias]]) => ({ k, n, c, alias }));
const GRAPE_BY_KEY = Object.fromEntries(GRAPES.map(g => [g.k, g]));

function parse() {
  const out = [];
  const seen = new Set();
  const add = (n, r, colors, grapes) => {
    if (seen.has(n)) return; seen.add(n);
    out.push({ n, r, c: colors, g: grapes });
  };
  for (const line of RAW.trim().split('\n')) {
    const [n, rc, colors, gs] = line.split('|');
    add(n, RC[rc], colors, gs.split(',').map(k => GRAPE_BY_KEY[k].n));
  }
  const gcGrapes = ['ri', 'gw', 'pg', 'mpg'].map(k => GRAPE_BY_KEY[k].n);
  ALSACE_GC.forEach(x => add('Alsace Grand Cru ' + x, 'Alsace', 'BD', gcGrapes));
  const cdrv = ['gr', 'sy', 'mo', 'ci'].map(k => GRAPE_BY_KEY[k].n);
  CDRV.forEach(x => add('Côtes du Rhône Villages ' + x, 'Vallée du Rhône', 'RBP', cdrv));
  return out.sort((a, b) => a.n.localeCompare(b.n, 'fr'));
}
export const APPELLATIONS = parse();

// ---------------------------------------------------------------------
export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();

const APP_INDEX = new Map(APPELLATIONS.map(a => [norm(a.n), a]));
export const findApp = name => APP_INDEX.get(norm(name)) || null;
export const regionOfApp = name => findApp(name)?.r || null;
const GRAPE_INDEX = new Map();
GRAPES.forEach(g => { GRAPE_INDEX.set(norm(g.n), g); g.alias.forEach(a => { if (!GRAPE_INDEX.has(norm(a))) GRAPE_INDEX.set(norm(a), g); }); });
export const findGrape = name => GRAPE_INDEX.get(norm(name)) || null;
export const canonGrape = name => findGrape(name)?.n || String(name).trim();

function rank(list, q, keyFn, aliasFn) {
  const nq = norm(q);
  if (!nq) return list.slice();
  const res = [];
  for (const it of list) {
    const k = norm(keyFn(it));
    let s = -1;
    if (k === nq) s = 100;
    else if (k.startsWith(nq)) s = 80;
    else if (k.split(' ').some(w => w.startsWith(nq))) s = 60;
    else if (k.includes(nq)) s = 40;
    else if (aliasFn) {
      const al = aliasFn(it).map(norm);
      if (al.some(a => a.startsWith(nq))) s = 50;
      else if (al.some(a => a.includes(nq))) s = 30;
    }
    if (s >= 0) res.push([s, it]);
  }
  return res.sort((a, b) => b[0] - a[0] || keyFn(a[1]).localeCompare(keyFn(b[1]), 'fr')).map(x => x[1]);
}
export const searchApps = (q, limit = 40) => rank(APPELLATIONS, q, a => a.n).slice(0, limit);
export const searchGrapes = (q, limit = 40) => rank(GRAPES, q, g => g.n, g => g.alias).slice(0, limit);
export const searchRegions = q => rank(REGIONS, q, r => r);

export const COLORS = { R: 'Rouge', B: 'Blanc', P: 'Rosé', E: 'Effervescent', D: 'Doux / Liquoreux' };
