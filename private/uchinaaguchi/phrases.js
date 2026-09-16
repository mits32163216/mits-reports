/* うちなーぐち辞書：主要30フレーズの台帳と、表示用の表記変換（phrases.html 専用） */

/* ───── 辞典の綴り → 本（西岡敏・仲原穣『沖縄語の入門』）の綴り。translate.html と同じ規則 ───── */
function toBook(s){
  if(!s) return "";
  s=String(s).replace(/[\]］=＝]/g,""); let o="",i=0;
  while(i<s.length){ const c=s[i], n=s[i+1]||"";
    if(c==="?"){o+="'";i++;continue;}
    if(c==="'"){i++;continue;}
    if(c==="Q"){ if(n==="c"||n==="C"){o+="c";i++;continue;}
                 if(n==="s"||n==="S"){o+="s";i++;continue;} o+=n;i++;continue;}
    if(c==="c"||c==="C"){o+="ch";i++;continue;}
    if(c==="S"){o+="sh";i++;continue;}
    if(c==="s"){ if(n==="i"){o+="sh";i++;continue;} if(n==="j"){o+="sh";i+=2;continue;} o+="s";i++;continue;}
    if(c==="Z"){o+="j";i++;continue;}
    if(c==="z"){ if(n==="i"){o+="j";i++;continue;} o+="z";i++;continue;}
    if(c==="j"){o+="y";i++;continue;}
    o+=c;i++;
  }
  return o;
}
/* 辞典の綴り → かな（辞書ページと同じ表・機械変換で未検証） */
const T2={kja:"きゃ",kju:"きゅ",kjo:"きょ",gja:"ぎゃ",gju:"ぎゅ",gjo:"ぎょ",sja:"しゃ",sju:"しゅ",sjo:"しょ",sje:"しぇ",zja:"じゃ",zju:"じゅ",zjo:"じょ",tja:"ちゃ",tju:"ちゅ",tjo:"ちょ",nja:"にゃ",nju:"にゅ",njo:"にょ",hja:"ひゃ",hju:"ひゅ",hjo:"ひょ",bja:"びゃ",bju:"びゅ",bjo:"びょ",pja:"ぴゃ",pju:"ぴゅ",pjo:"ぴょ",mja:"みゃ",mju:"みゅ",mjo:"みょ",rja:"りゃ",rju:"りゅ",rjo:"りょ",hwa:"ふぁ",hwi:"ふぃ",hwe:"ふぇ",hwo:"ふぉ",kwa:"くぁ",kwi:"くぃ",kwe:"くぇ",gwa:"ぐぁ",gwi:"ぐぃ",gwe:"ぐぇ"};
const T1={ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",sa:"さ",si:"し",su:"す",se:"せ",so:"そ",za:"ざ",zi:"じ",zu:"ず",ze:"ぜ",zo:"ぞ",ta:"た",ti:"てぃ",tu:"とぅ",te:"て",to:"と",da:"だ",di:"でぃ",du:"どぅ",de:"で",do:"ど",na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",ha:"は",hi:"ひ",hu:"ふ",he:"へ",ho:"ほ",ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",ja:"や",ji:"い",ju:"ゆ",je:"いぇ",jo:"よ",ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",wa:"わ",wi:"うぃ",wu:"う",we:"うぇ",wo:"を",ca:"ちゃ",ci:"ち",cu:"ちゅ",ce:"ちぇ",co:"ちょ",Ca:"ちゃ",Ci:"ち",Cu:"ちゅ",Ce:"ちぇ",Co:"ちょ",Sa:"しゃ",Si:"し",Su:"しゅ",Se:"しぇ",So:"しょ",Za:"じゃ",Zi:"じ",Zu:"じゅ",Ze:"じぇ",Zo:"じょ",a:"あ",i:"い",u:"う",e:"え",o:"お"};
const VOW={"a":"あ","i":"い","u":"う","e":"え","o":"お"};
const LASTV={"あ":"a","か":"a","が":"a","さ":"a","ざ":"a","た":"a","だ":"a","な":"a","は":"a","ば":"a","ぱ":"a","ま":"a","や":"a","ら":"a","わ":"a","ゃ":"a","ぁ":"a","い":"i","き":"i","ぎ":"i","し":"i","じ":"i","ち":"i","に":"i","ひ":"i","び":"i","ぴ":"i","み":"i","り":"i","ぃ":"i","う":"u","く":"u","ぐ":"u","す":"u","ず":"u","ぬ":"u","ふ":"u","ぶ":"u","ぷ":"u","む":"u","ゆ":"u","る":"u","ゅ":"u","ぅ":"u","え":"e","け":"e","げ":"e","せ":"e","ぜ":"e","て":"e","で":"e","ね":"e","へ":"e","べ":"e","ぺ":"e","め":"e","れ":"e","ぇ":"e","お":"o","こ":"o","ご":"o","そ":"o","ぞ":"o","と":"o","ど":"o","の":"o","ほ":"o","ぼ":"o","ぽ":"o","も":"o","よ":"o","ろ":"o","ょ":"o","ぉ":"o"};
function kanaOf(s){
  if(!s) return ""; s=String(s).replace(/[\]］='"]/g,"");
  let o=[],i=0;
  while(i<s.length){
    const c=s[i];
    if(c==="?"){i++;continue}
    if(c==="Q"){o.push("っ");i++;continue}
    if(c==="N"){o.push("ん");i++;continue}
    if(c==="-"){o.push("・");i++;continue}
    if(T2[s.slice(i,i+3)]){o.push(T2[s.slice(i,i+3)]);i+=3}
    else if(T1[s.slice(i,i+2)]){o.push(T1[s.slice(i,i+2)]);i+=2}
    else if(T1[c]){o.push(T1[c]);i++}
    else {o.push(c);i++}
    if(i<s.length&&VOW[s[i]]&&o.length&&LASTV[o[o.length-1].slice(-1)]===s[i]){o.push("ー");i++}
  }
  return o.join("");
}

/* ───── 主要30フレーズ ─────
   r は辞典の綴り（国立国語研究所『沖縄語辞典』の書き方）。表示のときに本の綴りとかなに直す。
   k は出どころの強さ：
     d = 辞典の用例そのまま
     e = 辞典の用例の型（語を入れ替えただけ）
     g = 辞典の語と活用の規則で組み立てた
     x = 辞典に無い語を含む（言い換えて表した） */
const PHRASES=[
 {ja:"お名前は何ですか？", r:"naaja nuu deebiruga", k:"g",
  src:"naa〔名前〕索引749頁／nuu〔何〕索引748頁／deebiruga は本文 caa の項「caa deebiruga いかがですか」"},
 {ja:"出身地はどこですか？", r:"?Nmarizimaa maa deebiruga", k:"g",
  src:"?Nmarizima〔生まれ島〕本文の見出し／maa〔どこ〕索引742頁／-a＋ja が -aa になるのは本文の用例「?anu muraa あの村は」"},
 {ja:"どこに住んでいますか？", r:"maanakai 'uibiiga", k:"g",
  src:"「住む」は辞典に語が無い（索引は →すまう）ため「どこにいますか」で表す。'uibiiN（います）は本文 -abi=juN の項／-nakai は用例「'jaanakai 家に」"},
 {ja:"元気ですか？", r:"?aQcumi", k:"d",
  src:"本文 ?aQ=cuN の項「?aQcumi. 元気か。」（目上には丁寧な言い方に変える）"},
 {ja:"あなたはどうですか？", r:"?uNzoo caa deebiruga", k:"g",
  src:"?uNzoo は本文 ?aN の用例「?uNzoo tabakunu ?amiSeebiimi あなたはたばこがおありになりますか」／caa deebiruga は caa の項"},
 {ja:"はじめまして", r:"hazimiti 'uganabira", k:"g",
  src:"hazimiti〔初めて〕索引760頁（はじめまして→hazimiti）／'uganabira は本文 cuu の項「cuu 'uganabira こんにちは（目上へ）」"},
 {ja:"何をしていますか？", r:"nuu sjabiiga", k:"e",
  src:"本文 nuu の項「?jaaja nuu sjuga おまえは何をしているか」を丁寧な形に。sjabii- は用例「'juu sjabiisa 気をつけます」"},
 {ja:"○○語を話しますか？", r:"○○guci sjabiimi", k:"e",
  src:"本文 sjuN の項「'jamatuguci sjuN 日本語を話す」を丁寧な問いに（-mi は「はい・いいえ」で答える問い）"},
 {ja:"なぜ○○語を勉強していますか？", r:"caaQsi ○○guci biNcoo sjabiiga", k:"g",
  src:"caaQsi は本文 caa の項「～Qsi どうして」／biNcoo は本文 sjuN の項「biNcooja siibusikooneeNkutu saN 勉強はしたくないからしない」"},
 {ja:"なぜなら○○だからです", r:"○○ 'jakutu", k:"e",
  src:"本文 ?aN の項「～'jakutu そうだから」。「〜です」まで付けた形は辞典で確かめられないため付けていない"},
 {ja:"どれくらい○○語を学んでいますか？", r:"caNnagee ○○guci naratooga", k:"g",
  src:"caNnagee〔どのくらいの時間〕索引743頁／narajuN〔習う・学ぶ〕の音便語幹 narat＋ooN（継続形）／問いの型は本文 kura=sjuN の用例「naNniN kuracooga 何年暮らしているか」"},
 {ja:"趣味は何ですか？", r:"'iirimuNnee nuu deebiruga", k:"g",
  src:"'iirimuN は本文266頁「1.おもちゃ。2.趣味としているもの。得意とするもの。」／-N＋ja が -Nnee になるのは用例「'waNnee sakee わたしは酒は」"},
 {ja:"○○したことはありますか？", r:"○○sjaru kutunu ?aibiimi", k:"e",
  src:"本文 ?uNnjuka=juN の項「…?uNnjukataru kutunu ?aibiimi こういう歌をお聞きになったことがありますか」"},
 {ja:"○○してもいいですか？", r:"○○QsiN 'jutasjaibiimi", k:"g",
  src:"'jutasjaN〔よい〕の丁寧な問い。形容詞の丁寧形 -ibiiN は本文 -abi=juN の項。この組み合わせの用例は辞典に無い"},
 {ja:"いつ○○しましたか？", r:"?iCi ○○sjabitaga", k:"g",
  src:"?iCi〔いつ〕索引629頁／sjabi-（丁寧形）＋-taN（過去）＋問いの -ga"},
 {ja:"○○が好きですか？", r:"○○ Sicabiimi", k:"e",
  src:"本文 SicuN の項「saki Sicumi 酒が好きか」を丁寧な形に（連用語幹 Sic＋abiimi）"},
 {ja:"○○はどういう意味ですか？", r:"○○ja caaru cimuee deebiruga", k:"g",
  src:"caaru は本文 baa の項「caaru baaga どういうわけか」／cimuee〔意味〕索引631頁"},
 {ja:"○○ができますか？", r:"○○nu najabiimi", k:"e",
  src:"本文 -ga の項「?jaa～ najumi おまえにできるか」を丁寧な形に（najuN の連用語幹 naj＋abiimi）"},
 {ja:"○○がありますか？", r:"○○nu ?aibiimi", k:"e",
  src:"?aibiiN（あります）は本文 -abi=juN の項／用例「kutunu ?aibiimi ことがありますか」"},
 {ja:"もう一度言ってください", r:"naa ?icidu ?iimisjoori", k:"g",
  src:"naa〔もう〕索引798頁／?icidu〔1度〕索引628頁／-misjoori〔…して下さい〕は本文 naahwiN の項「naahwiN kwimisjoori もっと下さい」"},
 {ja:"○○はいくらですか？", r:"○○ja caQsa deebiruga", k:"e",
  src:"本文 caQsa の項「?unu ?ijoo caQsaga その魚はいくらか」を丁寧な形に"},
 {ja:"○○に行きたいです", r:"○○Nkai ?icibusjaibiiN", k:"g",
  src:"?icibusjaN〔行きたい〕は本文 -busjaN の項／形容詞の丁寧形 -ibiiN は -abi=juN の項"},
 {ja:"○○まではどうやって行きますか？", r:"○○madee caaQsi ?icabiiga", k:"g",
  src:"-madi＋ja→madee／caaQsi〔どうして・どうやって〕／?icabi- は本文 ?icuN の項「?icabira 失礼いたします」"},
 {ja:"どの○○ですか？", r:"zinu ○○ deebiruga", k:"g",
  src:"zinu〔どの〕索引743頁"},
 {ja:"あの方はどなたですか？", r:"?amaamaa ?ujaNSeebiiga", k:"d",
  src:"本文 ?ama の項「?amaamaa ?ujaNSeebiiga あのかたはどなたでいらっしゃいますか」"},
 {ja:"何時ですか？", r:"naNduci deebiruga", k:"g",
  src:"naNduci〔何時〕索引750頁"},
 {ja:"おすすめの料理は何ですか？", r:"SiSimijuru maasamuNnee nuu deebiruga", k:"g",
  src:"SiSimijuN〔勧める〕本文485頁の連体形（連用語幹 SiSimij＋uru）で「勧めるおいしいものは何ですか」と表す。maasamuN〔うまいもの〕索引「うまい」。料理の hoocuu は本文では「料理人」のため使っていない"},
 {ja:"これをください", r:"kuri kwimisjoori", k:"e",
  src:"kuri〔これ〕索引687頁／本文 naahwiN の項「naahwiN kwimisjoori もっと下さい」"},
 {ja:"お会計をお願いします", r:"kaNzoo nigajabiiN", k:"g",
  src:"kaNzoo〔勘定〕索引663頁（saNmiN とも）／nigajuN〔願う〕の丁寧形。お店でこの言い方をするかは辞典で確かめられない"},
 {ja:"○○していただけますか？", r:"○○Qsi kwimiSeega", k:"e",
  src:"本文 kurumahwicaa の項「caQsaQsi nusiti kwimiSeega.（いくらでのせて下さいますか）」。kwimiSeeN〔下さる〕は本文 kwijuN の項"}
];
const PH_TAG={d:["t-d","辞典の用例そのまま"],e:["t-e","辞典の用例の型"],g:["t-g","辞典の語で組み立て"],x:["t-x","辞典に無い語を言い換え"]};
