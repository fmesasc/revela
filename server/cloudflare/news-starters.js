// Starting points for a newsletter (admin ▸ Novedades ▸ «Empezar desde…»): written in all 11 languages — the admin picks one and
// changes it. Words between {braces} are for the admin to fill in (a draft that still has them is not sent: news.js);
// *words* between asterisks are the title's italics. Made by hand (and translated), not by the AI at run time.
// { key: { name (what the admin sees), texts: { <lang>: { subject, preheader, eyebrow, title, intro, blocks: [{ title, text, image, cta, url }], outro } } } }
export const STARTERS = {
 "first": {
  "name": "Primer boletín: lo que puedes hacer con Revela",
  "texts": {
   "es": {
    "subject": "Lo que puedes hacer con Revela (y dónde empezar)",
    "preheader": "Animaciones con IA, tutoriales que se hacen, plantillas, mapas y 3D",
    "eyebrow": "Novedades",
    "title": "Presentaciones que *se mueven*",
    "intro": "Hola:\n\nGracias por apuntarte a las novedades de Revela. Te escribiremos de vez en cuando, solo cuando haya algo que merezca la pena. Para empezar, cuatro cosas que quizá no sabías que puedes hacer.",
    "blocks": [
     {
      "title": "Animaciones *con IA*",
      "text": "Escribe un tema —el ciclo del agua, la mitosis, el motor de cuatro tiempos— y la IA dibuja una animación explicativa por fases. Al presentar, cada clic reproduce una fase y se para, como un vídeo por tramos. La encuentras en IA ▸ Animación con IA.",
      "image": "",
      "cta": "Probar la animación",
      "url": "/app/"
     },
     {
      "title": "Tutoriales que se hacen, *no solo se miran*",
      "text": "Doce recorridos cortos en los que lo pruebas todo tú: un modelo 3D, un mapa que vuela, una votación en directo, la IA… Están en Ver ▸ Ayuda ▸ Tutorial interactivo.",
      "image": "",
      "cta": "Empezar un tutorial",
      "url": "/app/"
     },
     {
      "title": "Más de 450 plantillas",
      "text": "Presentaciones listas para clase y para la empresa: defensas de TFG, TFM y tesis, lecciones con animación, escape rooms, informes… Eliges una y la cambias a tu gusto.",
      "image": "",
      "cta": "Ver las plantillas",
      "url": "/templates"
     },
     {
      "title": "Mapas, 3D y votaciones en directo",
      "text": "Un mapa que vuela de un lugar a otro con cada clic, modelos 3D que se giran con el ratón y votaciones que el público contesta con el móvil, sin instalar nada.",
      "image": "",
      "cta": "Verlo en las guías",
      "url": "/guides"
     }
    ],
    "outro": "Si algo no te funciona o echas algo en falta, usa «Informar de un problema» dentro de la app: lo leemos todo."
   },
   "en": {
    "subject": "What you can do with Revela (and where to start)",
    "preheader": "AI animations, hands-on tutorials, templates, maps and 3D",
    "eyebrow": "News",
    "title": "Presentations that *move*",
    "intro": "Hi:\n\nThanks for signing up for Revela news. We will write now and then, only when there is something worth saying. To begin with, four things you may not know you can do.",
    "blocks": [
     {
      "title": "Animations *with AI*",
      "text": "Type a topic —the water cycle, mitosis, the four-stroke engine— and the AI draws an explainer animation in stages. When presenting, each click plays one stage and stops, like a video in segments. Find it in AI ▸ AI animation.",
      "image": "",
      "cta": "Try the animation",
      "url": "/app/"
     },
     {
      "title": "Tutorials you *do*, not just watch",
      "text": "Twelve short walk-throughs where you try everything yourself: a 3D model, a map that flies, a live vote, the AI… They are in View ▸ Help ▸ Interactive tutorial.",
      "image": "",
      "cta": "Start a tutorial",
      "url": "/app/"
     },
     {
      "title": "Over 450 templates",
      "text": "Presentations ready for class and for business: thesis defences, lessons with animation, escape rooms, reports… Pick one and change it as you like.",
      "image": "",
      "cta": "See the templates",
      "url": "/templates"
     },
     {
      "title": "Maps, 3D and live votes",
      "text": "A map that flies from place to place with each click, 3D models you turn with the mouse and votes the audience answers from their phones, with nothing to install.",
      "image": "",
      "cta": "See it in the guides",
      "url": "/guides"
     }
    ],
    "outro": "If something does not work or you miss something, use “Report a problem” inside the app: we read everything."
   },
   "ar": {
    "subject": "ما الذي يمكنك فعله مع Revela (ومن أين تبدأ)",
    "preheader": "رسوم متحركة بالذكاء الاصطناعي، أدلة تجربها بنفسك، قوالب، خرائط وثلاثي الأبعاد",
    "eyebrow": "الجديد",
    "title": "عروض تقديمية *تتحرك*",
    "intro": "مرحبًا:\n\nشكرًا لاشتراكك في أخبار Revela. سنراسلك بين حين وآخر، فقط عندما يكون لدينا ما يستحق. وللبداية، إليك أربعة أشياء ربما لم تكن تعلم أنك تستطيع فعلها.",
    "blocks": [
     {
      "title": "رسوم متحركة *بالذكاء الاصطناعي*",
      "text": "اكتب موضوعًا —دورة الماء، الانقسام المتساوي، محرك الأشواط الأربعة— فيرسم الذكاء الاصطناعي رسمًا متحركًا توضيحيًا على مراحل. عند العرض، كل نقرة تشغّل مرحلة واحدة ثم يتوقف، مثل فيديو مقسّم إلى مقاطع. ستجده في الذكاء الاصطناعي ▸ رسم متحرك بالذكاء الاصطناعي.",
      "image": "",
      "cta": "جرّب الرسم المتحرك",
      "url": "/app/"
     },
     {
      "title": "أدلة *تجربها بنفسك* لا تكتفي بمشاهدتها",
      "text": "اثنا عشر مسارًا قصيرًا تجرّب فيها كل شيء بنفسك: نموذج ثلاثي الأبعاد، خريطة تطير، تصويت مباشر، الذكاء الاصطناعي… تجدها في عرض ▸ تعليمات ▸ دليل تفاعلي.",
      "image": "",
      "cta": "ابدأ دليلًا",
      "url": "/app/"
     },
     {
      "title": "أكثر من 450 قالبًا",
      "text": "عروض جاهزة للصف وللشركة: مناقشات مشاريع التخرج والرسائل والأطروحات، دروس برسوم متحركة، غرف هروب، تقارير… اختر واحدًا وعدّله كما تشاء.",
      "image": "",
      "cta": "شاهد القوالب",
      "url": "/templates"
     },
     {
      "title": "خرائط وثلاثي الأبعاد وتصويت مباشر",
      "text": "خريطة تطير من مكان إلى آخر مع كل نقرة، ونماذج ثلاثية الأبعاد تديرها بالفأرة، وتصويت يجيب عنه الجمهور من هواتفهم دون تثبيت أي شيء.",
      "image": "",
      "cta": "شاهده في الأدلة",
      "url": "/guides"
     }
    ],
    "outro": "إن لم يعمل شيء كما ينبغي أو افتقدت أمرًا ما، استخدم «الإبلاغ عن مشكلة» داخل التطبيق: نقرأ كل شيء."
   },
   "ca": {
    "subject": "El que pots fer amb Revela (i per on començar)",
    "preheader": "Animacions amb IA, tutorials que es fan, plantilles, mapes i 3D",
    "eyebrow": "Novetats",
    "title": "Presentacions que *es mouen*",
    "intro": "Hola:\n\ngràcies per apuntar-te a les novetats de Revela. T'escriurem de tant en tant, només quan hi hagi alguna cosa que valgui la pena. Per començar, quatre coses que potser no sabies que pots fer.",
    "blocks": [
     {
      "title": "Animacions *amb IA*",
      "text": "Escriu un tema —el cicle de l'aigua, la mitosi, el motor de quatre temps— i la IA dibuixa una animació explicativa per fases. En presentar, cada clic reprodueix una fase i s'atura, com un vídeo per trams. La trobes a IA ▸ Animació amb IA.",
      "image": "",
      "cta": "Provar l'animació",
      "url": "/app/"
     },
     {
      "title": "Tutorials que *es fan*, no només es miren",
      "text": "Dotze recorreguts curts en què ho proves tot tu: un model 3D, un mapa que vola, una votació en directe, la IA… Són a Visualitza ▸ Ajuda ▸ Tutorial interactiu.",
      "image": "",
      "cta": "Començar un tutorial",
      "url": "/app/"
     },
     {
      "title": "Més de 450 plantilles",
      "text": "Presentacions a punt per a classe i per a l'empresa: defenses de TFG, TFM i tesi, lliçons amb animació, escape rooms, informes… En tries una i la canvies al teu gust.",
      "image": "",
      "cta": "Veure les plantilles",
      "url": "/templates"
     },
     {
      "title": "Mapes, 3D i votacions en directe",
      "text": "Un mapa que vola d'un lloc a un altre a cada clic, models 3D que es giren amb el ratolí i votacions que el públic contesta amb el mòbil, sense instal·lar res.",
      "image": "",
      "cta": "Veure-ho a les guies",
      "url": "/guides"
     }
    ],
    "outro": "Si alguna cosa no et funciona o en trobes a faltar alguna, fes servir «Informa d'un problema» dins de l'app: ho llegim tot."
   },
   "de": {
    "subject": "Was Sie mit Revela tun können (und wo Sie anfangen)",
    "preheader": "KI-Animationen, Tutorials zum Selbermachen, Vorlagen, Karten und 3D",
    "eyebrow": "Neuigkeiten",
    "title": "Präsentationen, die sich *bewegen*",
    "intro": "Guten Tag,\n\nvielen Dank für die Anmeldung zu den Neuigkeiten von Revela. Wir schreiben Ihnen ab und zu, nur wenn es etwas Lohnendes gibt. Zum Anfang vier Dinge, von denen Sie vielleicht nicht wussten, dass Sie sie tun können.",
    "blocks": [
     {
      "title": "Animationen *mit KI*",
      "text": "Geben Sie ein Thema ein —den Wasserkreislauf, die Mitose, den Viertaktmotor— und die KI zeichnet eine erklärende Animation in Phasen. Beim Präsentieren spielt jeder Klick eine Phase ab und hält dann an, wie ein Video in Abschnitten. Sie finden sie unter KI ▸ KI-Animation.",
      "image": "",
      "cta": "Animation ausprobieren",
      "url": "/app/"
     },
     {
      "title": "Tutorials zum *Selbermachen*, nicht nur zum Zuschauen",
      "text": "Zwölf kurze Rundgänge, in denen Sie alles selbst ausprobieren: ein 3D-Modell, eine fliegende Karte, eine Live-Abstimmung, die KI… Sie finden sie unter Ansicht ▸ Hilfe ▸ Interaktives Tutorial.",
      "image": "",
      "cta": "Ein Tutorial starten",
      "url": "/app/"
     },
     {
      "title": "Über 450 Vorlagen",
      "text": "Fertige Präsentationen für den Unterricht und fürs Unternehmen: Abschlussarbeit-Verteidigungen, Lektionen mit Animation, Escape Rooms, Berichte… Sie wählen eine aus und ändern sie nach Ihrem Geschmack.",
      "image": "",
      "cta": "Vorlagen ansehen",
      "url": "/templates"
     },
     {
      "title": "Karten, 3D und Live-Abstimmungen",
      "text": "Eine Karte, die bei jedem Klick von Ort zu Ort fliegt, 3D-Modelle, die Sie mit der Maus drehen, und Abstimmungen, die das Publikum mit dem Handy beantwortet, ohne etwas zu installieren.",
      "image": "",
      "cta": "In den Anleitungen ansehen",
      "url": "/guides"
     }
    ],
    "outro": "Wenn etwas nicht funktioniert oder Ihnen etwas fehlt, nutzen Sie „Problem melden“ in der App: Wir lesen alles."
   },
   "eu": {
    "subject": "Zer egin dezakezun Revelarekin (eta nondik hasi)",
    "preheader": "AA bidezko animazioak, egiten diren tutorialak, txantiloiak, mapak eta 3D",
    "eyebrow": "Berriak",
    "title": "Mugitzen diren *aurkezpenak*",
    "intro": "Kaixo:\n\nEskerrik asko Revelaren berrietarako izena emateagatik. Noizean behin idatziko dizugu, merezi duen zerbait dagoenean bakarrik. Hasteko, egin dezakezula ez zenekien lau gauza.",
    "blocks": [
     {
      "title": "Animazioak *AArekin*",
      "text": "Idatzi gai bat —uraren zikloa, mitosia, lau aldiko motorra— eta AAk azalpen-animazio bat marrazten du faseka. Aurkezterakoan, klik bakoitzak fase bat erreproduzitzen du eta gelditu egiten da, zatika banatutako bideo bat bezala. AA ▸ AA bidezko animazioa atalean aurkituko duzu.",
      "image": "",
      "cta": "Animazioa probatu",
      "url": "/app/"
     },
     {
      "title": "Begiratzeaz gain, *egiten diren* tutorialak",
      "text": "Hamabi ibilbide labur, guztia zuk zeuk probatzen duzuna: 3D eredu bat, hegan egiten duen mapa bat, zuzeneko bozketa bat, AA… Ikusi ▸ Laguntza ▸ Tutorial interaktiboa atalean daude.",
      "image": "",
      "cta": "Tutorial bat hasi",
      "url": "/app/"
     },
     {
      "title": "450 txantiloi baino gehiago",
      "text": "Gelarako eta enpresarako prest dauden aurkezpenak: gradu amaierako lanen, master amaierako lanen eta tesien defentsak, animaziodun ikasgaiak, ihesaldi-gelak, txostenak… Bat aukeratu eta zure gustura aldatu.",
      "image": "",
      "cta": "Txantiloiak ikusi",
      "url": "/templates"
     },
     {
      "title": "Mapak, 3D eta zuzeneko bozketak",
      "text": "Klik bakoitzarekin leku batetik bestera hegan egiten duen mapa bat, saguarekin biratzen diren 3D ereduak eta publikoak mugikorrarekin erantzuten dituen bozketak, ezer instalatu gabe.",
      "image": "",
      "cta": "Gidetan ikusi",
      "url": "/guides"
     }
    ],
    "outro": "Zerbait ez bada ibiltzen edo zerbait falta bazaizu, erabili aplikazioaren barruko «Arazo baten berri eman»: dena irakurtzen dugu."
   },
   "fr": {
    "subject": "Ce que vous pouvez faire avec Revela (et par où commencer)",
    "preheader": "Animations par IA, tutoriels à faire soi-même, modèles, cartes et 3D",
    "eyebrow": "Nouveautés",
    "title": "Des présentations qui *bougent*",
    "intro": "Bonjour,\n\nMerci de vous être inscrit(e) aux nouveautés de Revela. Nous vous écrirons de temps en temps, seulement quand il y a quelque chose qui en vaut la peine. Pour commencer, quatre choses que vous ne saviez peut-être pas pouvoir faire.",
    "blocks": [
     {
      "title": "Animations *par IA*",
      "text": "Écrivez un sujet —le cycle de l'eau, la mitose, le moteur à quatre temps— et l'IA dessine une animation explicative par étapes. En présentation, chaque clic joue une étape puis s'arrête, comme une vidéo par segments. Vous la trouvez dans IA ▸ Animation par IA.",
      "image": "",
      "cta": "Essayer l'animation",
      "url": "/app/"
     },
     {
      "title": "Des tutoriels à *faire*, pas seulement à regarder",
      "text": "Douze parcours courts où vous essayez tout vous-même : un modèle 3D, une carte qui survole le monde, un vote en direct, l'IA… Ils sont dans Affichage ▸ Aide ▸ Tutoriel interactif.",
      "image": "",
      "cta": "Commencer un tutoriel",
      "url": "/app/"
     },
     {
      "title": "Plus de 450 modèles",
      "text": "Des présentations prêtes à l'emploi pour la classe et l'entreprise : soutenances de mémoire et de thèse, leçons animées, escape games, rapports… Vous en choisissez une et vous la modifiez à votre goût.",
      "image": "",
      "cta": "Voir les modèles",
      "url": "/templates"
     },
     {
      "title": "Cartes, 3D et votes en direct",
      "text": "Une carte qui vole d'un lieu à l'autre à chaque clic, des modèles 3D qu'on fait tourner à la souris et des votes auxquels le public répond depuis son téléphone, sans rien installer.",
      "image": "",
      "cta": "Voir dans les guides",
      "url": "/guides"
     }
    ],
    "outro": "Si quelque chose ne fonctionne pas ou vous manque, utilisez « Signaler un problème » dans l'application : nous lisons tout."
   },
   "gl": {
    "subject": "O que podes facer con Revela (e por onde comezar)",
    "preheader": "Animacións con IA, titoriais que se fan, modelos, mapas e 3D",
    "eyebrow": "Novidades",
    "title": "Presentacións que *se moven*",
    "intro": "Ola:\n\nGrazas por apuntarte ás novidades de Revela. Escribirémosche de vez en cando, só cando haxa algo que mereza a pena. Para comezar, catro cousas que quizais non sabías que podes facer.",
    "blocks": [
     {
      "title": "Animacións *con IA*",
      "text": "Escribe un tema —o ciclo da auga, a mitose, o motor de catro tempos— e a IA debuxa unha animación explicativa por fases. Ao presentar, cada clic reproduce unha fase e para, coma un vídeo por tramos. Atópala en IA ▸ Animación con IA.",
      "image": "",
      "cta": "Probar a animación",
      "url": "/app/"
     },
     {
      "title": "Titoriais que se fan, *non só se miran*",
      "text": "Doce percorridos curtos nos que o probas todo ti: un modelo 3D, un mapa que voa, unha votación en directo, a IA… Están en Ver ▸ Axuda ▸ Titorial interactivo.",
      "image": "",
      "cta": "Comezar un titorial",
      "url": "/app/"
     },
     {
      "title": "Máis de 450 modelos",
      "text": "Presentacións listas para clase e para a empresa: defensas de TFG, TFM e tese, leccións con animación, escape rooms, informes… Escolles unha e cámbiala ao teu gusto.",
      "image": "",
      "cta": "Ver os modelos",
      "url": "/templates"
     },
     {
      "title": "Mapas, 3D e votacións en directo",
      "text": "Un mapa que voa duns lugares a outros con cada clic, modelos 3D que se xiran co rato e votacións que o público contesta co móbil, sen instalar nada.",
      "image": "",
      "cta": "Velo nas guías",
      "url": "/guides"
     }
    ],
    "outro": "Se algo non che funciona ou botas algo en falta, usa «Informar dun problema» dentro da app: lémolo todo."
   },
   "it": {
    "subject": "Cosa puoi fare con Revela (e da dove iniziare)",
    "preheader": "Animazioni con IA, tutorial da fare, modelli, mappe e 3D",
    "eyebrow": "Novità",
    "title": "Presentazioni che *si muovono*",
    "intro": "Ciao,\n\ngrazie per esserti iscritto alle novità di Revela. Ti scriveremo ogni tanto, solo quando c'è qualcosa che vale la pena. Per cominciare, quattro cose che forse non sapevi di poter fare.",
    "blocks": [
     {
      "title": "Animazioni *con IA*",
      "text": "Scrivi un argomento —il ciclo dell'acqua, la mitosi, il motore a quattro tempi— e l'IA disegna un'animazione esplicativa per fasi. In presentazione, ogni clic riproduce una fase e si ferma, come un video a segmenti. La trovi in IA ▸ Animazione con IA.",
      "image": "",
      "cta": "Prova l'animazione",
      "url": "/app/"
     },
     {
      "title": "Tutorial che *si fanno*, non solo si guardano",
      "text": "Dodici percorsi brevi in cui provi tutto tu: un modello 3D, una mappa che vola, un voto in diretta, l'IA… Sono in Visualizza ▸ Aiuto ▸ Tutorial interattivo.",
      "image": "",
      "cta": "Inizia un tutorial",
      "url": "/app/"
     },
     {
      "title": "Oltre 450 modelli",
      "text": "Presentazioni pronte per la classe e per l'azienda: discussioni di tesi, lezioni con animazione, escape room, relazioni… Ne scegli una e la cambi a tuo gusto.",
      "image": "",
      "cta": "Vedi i modelli",
      "url": "/templates"
     },
     {
      "title": "Mappe, 3D e votazioni in diretta",
      "text": "Una mappa che vola da un luogo all'altro a ogni clic, modelli 3D che si ruotano con il mouse e votazioni a cui il pubblico risponde dal telefono, senza installare nulla.",
      "image": "",
      "cta": "Guardalo nelle guide",
      "url": "/guides"
     }
    ],
    "outro": "Se qualcosa non funziona o ti manca, usa «Segnala un problema» nell'app: leggiamo tutto."
   },
   "nl": {
    "subject": "Wat je met Revela kunt doen (en waar je begint)",
    "preheader": "AI-animaties, rondleidingen die je zelf doet, sjablonen, kaarten en 3D",
    "eyebrow": "Nieuws",
    "title": "Presentaties die *bewegen*",
    "intro": "Hoi:\n\nBedankt voor je aanmelding voor het nieuws van Revela. We schrijven je af en toe, alleen als er iets de moeite waard is. Om te beginnen vier dingen waarvan je misschien niet wist dat het kan.",
    "blocks": [
     {
      "title": "Animaties *met AI*",
      "text": "Typ een onderwerp —de waterkringloop, mitose, de viertaktmotor— en de AI tekent een uitleganimatie in fasen. Tijdens het presenteren speelt elke klik één fase af en stopt dan, zoals een video in stukken. Je vindt het onder AI ▸ AI-animatie.",
      "image": "",
      "cta": "De animatie proberen",
      "url": "/app/"
     },
     {
      "title": "Rondleidingen die je *doet*, niet alleen bekijkt",
      "text": "Twaalf korte rondleidingen waarin je alles zelf probeert: een 3D-model, een kaart die vliegt, een live stemming, de AI… Je vindt ze onder Beeld ▸ Help ▸ Interactieve rondleiding.",
      "image": "",
      "cta": "Een rondleiding starten",
      "url": "/app/"
     },
     {
      "title": "Meer dan 450 sjablonen",
      "text": "Presentaties klaar voor de klas en voor het bedrijf: verdedigingen van scripties en proefschriften, lessen met animatie, escape rooms, rapporten… Kies er een en pas hem aan zoals je wilt.",
      "image": "",
      "cta": "De sjablonen bekijken",
      "url": "/templates"
     },
     {
      "title": "Kaarten, 3D en live stemmingen",
      "text": "Een kaart die bij elke klik van plaats naar plaats vliegt, 3D-modellen die je met de muis draait en stemmingen die het publiek met de telefoon beantwoordt, zonder iets te installeren.",
      "image": "",
      "cta": "Bekijk het in de gidsen",
      "url": "/guides"
     }
    ],
    "outro": "Werkt er iets niet of mis je iets? Gebruik dan «Een probleem melden» in de app: we lezen alles."
   },
   "pt": {
    "subject": "O que podes fazer com o Revela (e por onde começar)",
    "preheader": "Animações com IA, tutoriais para fazer, modelos, mapas e 3D",
    "eyebrow": "Novidades",
    "title": "Apresentações que *se mexem*",
    "intro": "Olá,\n\nobrigado por te inscreveres nas novidades do Revela. Escrevemos de vez em quando, só quando houver algo que valha a pena. Para começar, quatro coisas que talvez não soubesses que podes fazer.",
    "blocks": [
     {
      "title": "Animações *com IA*",
      "text": "Escreve um tema —o ciclo da água, a mitose, o motor de quatro tempos— e a IA desenha uma animação explicativa por fases. Ao apresentar, cada clique reproduz uma fase e para, como um vídeo por troços. Encontras em IA ▸ Animação com IA.",
      "image": "",
      "cta": "Experimentar a animação",
      "url": "/app/"
     },
     {
      "title": "Tutoriais que *se fazem*, não só se veem",
      "text": "Doze percursos curtos em que experimentas tudo tu: um modelo 3D, um mapa que voa, uma votação em direto, a IA… Estão em Ver ▸ Ajuda ▸ Tutorial interativo.",
      "image": "",
      "cta": "Começar um tutorial",
      "url": "/app/"
     },
     {
      "title": "Mais de 450 modelos",
      "text": "Apresentações prontas para a aula e para a empresa: defesas de dissertação e de tese, lições com animação, escape rooms, relatórios… Escolhes uma e mudas ao teu gosto.",
      "image": "",
      "cta": "Ver os modelos",
      "url": "/templates"
     },
     {
      "title": "Mapas, 3D e votações em direto",
      "text": "Um mapa que voa de um lugar para outro a cada clique, modelos 3D que se rodam com o rato e votações a que o público responde pelo telemóvel, sem instalar nada.",
      "image": "",
      "cta": "Ver nos guias",
      "url": "/guides"
     }
    ],
    "outro": "Se algo não funcionar ou te fizer falta, usa «Comunicar um problema» dentro da app: lemos tudo."
   }
  }
 },
 "month": {
  "name": "Novedades del mes",
  "texts": {
   "es": {
    "subject": "Novedades de Revela: {mes}",
    "preheader": "Lo que hemos preparado este mes",
    "eyebrow": "Novedades · {mes}",
    "title": "Lo *nuevo* de Revela este mes",
    "intro": "Hola:\n\nEstas son las novedades de {mes}, para que hacer presentaciones sea más fácil y más vistoso.",
    "blocks": [
     {
      "title": "{Novedad principal}",
      "text": "{Cuenta en dos o tres frases qué es y para qué sirve.}",
      "image": "",
      "cta": "Probarlo",
      "url": "/app/"
     },
     {
      "title": "{Segunda novedad}",
      "text": "{Cuenta en dos o tres frases qué es y para qué sirve.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Plantillas nuevas",
      "text": "{Qué colecciones se han añadido este mes.}",
      "image": "",
      "cta": "Ver las plantillas",
      "url": "/templates"
     }
    ],
    "outro": "Gracias por usar Revela. Si algo no te funciona, usa «Informar de un problema» dentro de la app."
   },
   "en": {
    "subject": "Revela news: {month}",
    "preheader": "What we have prepared this month",
    "eyebrow": "News · {month}",
    "title": "What is *new* in Revela this month",
    "intro": "Hi:\n\nHere is the news for {month}, to make presentations easier and more striking.",
    "blocks": [
     {
      "title": "{Main news}",
      "text": "{Say in two or three sentences what it is and what it is for.}",
      "image": "",
      "cta": "Try it",
      "url": "/app/"
     },
     {
      "title": "{Second news}",
      "text": "{Say in two or three sentences what it is and what it is for.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "New templates",
      "text": "{Which collections were added this month.}",
      "image": "",
      "cta": "See the templates",
      "url": "/templates"
     }
    ],
    "outro": "Thanks for using Revela. If something does not work, use “Report a problem” inside the app."
   },
   "ar": {
    "subject": "أخبار Revela: {الشهر}",
    "preheader": "ما أعددناه هذا الشهر",
    "eyebrow": "الجديد · {الشهر}",
    "title": "ما *الجديد* في Revela هذا الشهر",
    "intro": "مرحبًا:\n\nإليك أخبار {الشهر}، لنجعل إعداد العروض أسهل وأجمل.",
    "blocks": [
     {
      "title": "{الميزة الجديدة الرئيسية}",
      "text": "{اشرح في جملتين أو ثلاث ما هي وفيمَ تفيد.}",
      "image": "",
      "cta": "جرّبها",
      "url": "/app/"
     },
     {
      "title": "{الميزة الجديدة الثانية}",
      "text": "{اشرح في جملتين أو ثلاث ما هي وفيمَ تفيد.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "قوالب جديدة",
      "text": "{المجموعات التي أُضيفت هذا الشهر.}",
      "image": "",
      "cta": "شاهد القوالب",
      "url": "/templates"
     }
    ],
    "outro": "شكرًا لاستخدامك Revela. إن لم يعمل شيء كما ينبغي، استخدم «الإبلاغ عن مشكلة» داخل التطبيق."
   },
   "ca": {
    "subject": "Novetats de Revela: {mes}",
    "preheader": "El que hem preparat aquest mes",
    "eyebrow": "Novetats · {mes}",
    "title": "El que hi ha de *nou* a Revela aquest mes",
    "intro": "Hola:\n\naquestes són les novetats de {mes}, perquè fer presentacions sigui més fàcil i més vistós.",
    "blocks": [
     {
      "title": "{Novetat principal}",
      "text": "{Explica en dues o tres frases què és i per a què serveix.}",
      "image": "",
      "cta": "Provar-ho",
      "url": "/app/"
     },
     {
      "title": "{Segona novetat}",
      "text": "{Explica en dues o tres frases què és i per a què serveix.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Plantilles noves",
      "text": "{Quines col·leccions s'han afegit aquest mes.}",
      "image": "",
      "cta": "Veure les plantilles",
      "url": "/templates"
     }
    ],
    "outro": "Gràcies per fer servir Revela. Si alguna cosa no et funciona, fes servir «Informa d'un problema» dins de l'app."
   },
   "de": {
    "subject": "Neuigkeiten von Revela: {Monat}",
    "preheader": "Was wir diesen Monat vorbereitet haben",
    "eyebrow": "Neuigkeiten · {Monat}",
    "title": "Das *Neue* bei Revela in diesem Monat",
    "intro": "Guten Tag,\n\nhier sind die Neuigkeiten für {Monat}, damit Präsentationen einfacher und wirkungsvoller werden.",
    "blocks": [
     {
      "title": "{Wichtigste Neuigkeit}",
      "text": "{Sagen Sie in zwei oder drei Sätzen, was es ist und wofür es dient.}",
      "image": "",
      "cta": "Ausprobieren",
      "url": "/app/"
     },
     {
      "title": "{Zweite Neuigkeit}",
      "text": "{Sagen Sie in zwei oder drei Sätzen, was es ist und wofür es dient.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Neue Vorlagen",
      "text": "{Welche Sammlungen diesen Monat hinzugekommen sind.}",
      "image": "",
      "cta": "Vorlagen ansehen",
      "url": "/templates"
     }
    ],
    "outro": "Danke, dass Sie Revela nutzen. Wenn etwas nicht funktioniert, nutzen Sie „Problem melden“ in der App."
   },
   "eu": {
    "subject": "Revelaren berriak: {hilabetea}",
    "preheader": "Hilabete honetan prestatu duguna",
    "eyebrow": "Berriak · {hilabetea}",
    "title": "Revelaren *berria* hilabete honetan",
    "intro": "Kaixo:\n\nHona hemen hilabete honetako berriak ({hilabetea}), aurkezpenak egitea errazago eta ikusgarriago izan dadin.",
    "blocks": [
     {
      "title": "{Berri nagusia}",
      "text": "{Esan bi edo hiru esalditan zer den eta zertarako balio duen.}",
      "image": "",
      "cta": "Probatu",
      "url": "/app/"
     },
     {
      "title": "{Bigarren berria}",
      "text": "{Esan bi edo hiru esalditan zer den eta zertarako balio duen.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Txantiloi berriak",
      "text": "{Zer bilduma gehitu diren hilabete honetan.}",
      "image": "",
      "cta": "Txantiloiak ikusi",
      "url": "/templates"
     }
    ],
    "outro": "Eskerrik asko Revela erabiltzeagatik. Zerbait ez bazaizu ibiltzen, erabili aplikazioaren barruko «Arazo baten berri eman»."
   },
   "fr": {
    "subject": "Nouveautés de Revela : {mois}",
    "preheader": "Ce que nous avons préparé ce mois-ci",
    "eyebrow": "Nouveautés · {mois}",
    "title": "Les *nouveautés* de Revela ce mois-ci",
    "intro": "Bonjour,\n\nVoici les nouveautés de {mois}, pour que créer des présentations soit plus simple et plus percutant.",
    "blocks": [
     {
      "title": "{Nouveauté principale}",
      "text": "{Dites en deux ou trois phrases ce que c'est et à quoi ça sert.}",
      "image": "",
      "cta": "L'essayer",
      "url": "/app/"
     },
     {
      "title": "{Deuxième nouveauté}",
      "text": "{Dites en deux ou trois phrases ce que c'est et à quoi ça sert.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Nouveaux modèles",
      "text": "{Quelles collections ont été ajoutées ce mois-ci.}",
      "image": "",
      "cta": "Voir les modèles",
      "url": "/templates"
     }
    ],
    "outro": "Merci d'utiliser Revela. Si quelque chose ne fonctionne pas, utilisez « Signaler un problème » dans l'application."
   },
   "gl": {
    "subject": "Novidades de Revela: {mes}",
    "preheader": "O que preparamos este mes",
    "eyebrow": "Novidades · {mes}",
    "title": "O *novo* de Revela este mes",
    "intro": "Ola:\n\nEstas son as novidades de {mes}, para que facer presentacións sexa máis fácil e máis vistoso.",
    "blocks": [
     {
      "title": "{Novidade principal}",
      "text": "{Conta en dúas ou tres frases que é e para que serve.}",
      "image": "",
      "cta": "Probalo",
      "url": "/app/"
     },
     {
      "title": "{Segunda novidade}",
      "text": "{Conta en dúas ou tres frases que é e para que serve.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Modelos novos",
      "text": "{Que coleccións se engadiron este mes.}",
      "image": "",
      "cta": "Ver os modelos",
      "url": "/templates"
     }
    ],
    "outro": "Grazas por usar Revela. Se algo non che funciona, usa «Informar dun problema» dentro da app."
   },
   "it": {
    "subject": "Novità di Revela: {mese}",
    "preheader": "Cosa abbiamo preparato questo mese",
    "eyebrow": "Novità · {mese}",
    "title": "Le *novità* di Revela questo mese",
    "intro": "Ciao,\n\necco le novità di {mese}, per rendere le presentazioni più semplici e più d'effetto.",
    "blocks": [
     {
      "title": "{Novità principale}",
      "text": "{Racconta in due o tre frasi cos'è e a cosa serve.}",
      "image": "",
      "cta": "Provala",
      "url": "/app/"
     },
     {
      "title": "{Seconda novità}",
      "text": "{Racconta in due o tre frasi cos'è e a cosa serve.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Nuovi modelli",
      "text": "{Quali raccolte sono state aggiunte questo mese.}",
      "image": "",
      "cta": "Vedi i modelli",
      "url": "/templates"
     }
    ],
    "outro": "Grazie per usare Revela. Se qualcosa non funziona, usa «Segnala un problema» nell'app."
   },
   "nl": {
    "subject": "Nieuws van Revela: {maand}",
    "preheader": "Wat we deze maand hebben voorbereid",
    "eyebrow": "Nieuws · {maand}",
    "title": "Wat is er *nieuw* in Revela deze maand",
    "intro": "Hoi:\n\nHier is het nieuws van {maand}, om presentaties maken makkelijker en mooier te maken.",
    "blocks": [
     {
      "title": "{Belangrijkste nieuwtje}",
      "text": "{Vertel in twee of drie zinnen wat het is en waarvoor het dient.}",
      "image": "",
      "cta": "Proberen",
      "url": "/app/"
     },
     {
      "title": "{Tweede nieuwtje}",
      "text": "{Vertel in twee of drie zinnen wat het is en waarvoor het dient.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Nieuwe sjablonen",
      "text": "{Welke collecties deze maand zijn toegevoegd.}",
      "image": "",
      "cta": "De sjablonen bekijken",
      "url": "/templates"
     }
    ],
    "outro": "Bedankt dat je Revela gebruikt. Werkt er iets niet, gebruik dan «Een probleem melden» in de app."
   },
   "pt": {
    "subject": "Novidades do Revela: {mês}",
    "preheader": "O que preparámos este mês",
    "eyebrow": "Novidades · {mês}",
    "title": "O que há de *novo* no Revela este mês",
    "intro": "Olá,\n\naqui estão as novidades de {mês}, para tornar as apresentações mais fáceis e mais vistosas.",
    "blocks": [
     {
      "title": "{Novidade principal}",
      "text": "{Conta em duas ou três frases o que é e para que serve.}",
      "image": "",
      "cta": "Experimentar",
      "url": "/app/"
     },
     {
      "title": "{Segunda novidade}",
      "text": "{Conta em duas ou três frases o que é e para que serve.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Modelos novos",
      "text": "{Que coleções foram acrescentadas este mês.}",
      "image": "",
      "cta": "Ver os modelos",
      "url": "/templates"
     }
    ],
    "outro": "Obrigado por usares o Revela. Se algo não funcionar, usa «Comunicar um problema» dentro da app."
   }
  }
 },
 "feature": {
  "name": "Una función nueva",
  "texts": {
   "es": {
    "subject": "Nuevo en Revela: {nombre de la función}",
    "preheader": "{Una frase que explique qué permite hacer}",
    "eyebrow": "Nueva función",
    "title": "{Nombre de la función}, *ya disponible*",
    "intro": "Hola:\n\nHemos añadido {nombre de la función}: {qué permite hacer, en una frase}.",
    "blocks": [
     {
      "title": "Cómo se usa",
      "text": "1. Abre {dónde está}.\n\n2. {Segundo paso}.\n\n3. {Tercer paso}.",
      "image": "",
      "cta": "Probarlo ahora",
      "url": "/app/"
     },
     {
      "title": "Para qué te sirve",
      "text": "{Un ejemplo concreto: una clase, una reunión, una defensa…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Cuéntanos qué te parece con «Informar de un problema» dentro de la app."
   },
   "en": {
    "subject": "New in Revela: {feature name}",
    "preheader": "{One sentence on what it lets you do}",
    "eyebrow": "New feature",
    "title": "{Feature name}, *now available*",
    "intro": "Hi:\n\nWe have added {feature name}: {what it lets you do, in one sentence}.",
    "blocks": [
     {
      "title": "How to use it",
      "text": "1. Open {where it is}.\n\n2. {Second step}.\n\n3. {Third step}.",
      "image": "",
      "cta": "Try it now",
      "url": "/app/"
     },
     {
      "title": "What it is for",
      "text": "{A concrete example: a class, a meeting, a thesis defence…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Tell us what you think with “Report a problem” inside the app."
   },
   "ar": {
    "subject": "جديد في Revela: {اسم الميزة}",
    "preheader": "{جملة واحدة عمّا تتيح لك فعله}",
    "eyebrow": "ميزة جديدة",
    "title": "{اسم الميزة}، *متاحة الآن*",
    "intro": "مرحبًا:\n\nأضفنا {اسم الميزة}: {ما تتيح لك فعله، في جملة واحدة}.",
    "blocks": [
     {
      "title": "طريقة الاستخدام",
      "text": "1. افتح {مكانها}.\n\n2. {الخطوة الثانية}.\n\n3. {الخطوة الثالثة}.",
      "image": "",
      "cta": "جرّبها الآن",
      "url": "/app/"
     },
     {
      "title": "فيمَ تفيدك",
      "text": "{مثال محدد: حصة دراسية، اجتماع، مناقشة…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "أخبرنا برأيك عبر «الإبلاغ عن مشكلة» داخل التطبيق."
   },
   "ca": {
    "subject": "Nou a Revela: {nom de la funció}",
    "preheader": "{Una frase sobre què permet fer}",
    "eyebrow": "Funció nova",
    "title": "{Nom de la funció}, *ja disponible*",
    "intro": "Hola:\n\nhem afegit {nom de la funció}: {què permet fer, en una frase}.",
    "blocks": [
     {
      "title": "Com es fa servir",
      "text": "1. Obre {on és}.\n\n2. {Segon pas}.\n\n3. {Tercer pas}.",
      "image": "",
      "cta": "Provar-ho ara",
      "url": "/app/"
     },
     {
      "title": "Per a què et serveix",
      "text": "{Un exemple concret: una classe, una reunió, una defensa…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Explica'ns què et sembla amb «Informa d'un problema» dins de l'app."
   },
   "de": {
    "subject": "Neu in Revela: {Name der Funktion}",
    "preheader": "{Ein Satz dazu, was sie möglich macht}",
    "eyebrow": "Neue Funktion",
    "title": "{Name der Funktion}, *jetzt verfügbar*",
    "intro": "Guten Tag,\n\nwir haben {Name der Funktion} hinzugefügt: {was sie möglich macht, in einem Satz}.",
    "blocks": [
     {
      "title": "So geht es",
      "text": "1. Öffnen Sie {wo sie zu finden ist}.\n\n2. {Zweiter Schritt}.\n\n3. {Dritter Schritt}.",
      "image": "",
      "cta": "Jetzt ausprobieren",
      "url": "/app/"
     },
     {
      "title": "Wozu sie Ihnen nützt",
      "text": "{Ein konkretes Beispiel: ein Unterricht, ein Meeting, eine Verteidigung…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Sagen Sie uns, was Sie davon halten, über „Problem melden“ in der App."
   },
   "eu": {
    "subject": "Berria Revelan: {funtzioaren izena}",
    "preheader": "{Zer egiteko aukera ematen duen azaltzen duen esaldi bat}",
    "eyebrow": "Funtzio berria",
    "title": "{Funtzioaren izena}, *eskuragarri jada*",
    "intro": "Kaixo:\n\n{funtzioaren izena} gehitu dugu: {zer egiteko aukera ematen duen, esaldi batean}.",
    "blocks": [
     {
      "title": "Nola erabili",
      "text": "1. Ireki {non dagoen}.\n\n2. {Bigarren urratsa}.\n\n3. {Hirugarren urratsa}.",
      "image": "",
      "cta": "Orain probatu",
      "url": "/app/"
     },
     {
      "title": "Zertarako balio dizu",
      "text": "{Adibide zehatz bat: klase bat, bilera bat, defentsa bat…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Esaiguzu zer iruditzen zaizun aplikazioaren barruko «Arazo baten berri eman» erabiliz."
   },
   "fr": {
    "subject": "Nouveau dans Revela : {nom de la fonction}",
    "preheader": "{Une phrase sur ce que cela permet de faire}",
    "eyebrow": "Nouvelle fonction",
    "title": "{Nom de la fonction}, *déjà disponible*",
    "intro": "Bonjour,\n\nNous avons ajouté {nom de la fonction} : {ce qu'elle permet de faire, en une phrase}.",
    "blocks": [
     {
      "title": "Comment l'utiliser",
      "text": "1. Ouvrez {où elle se trouve}.\n\n2. {Deuxième étape}.\n\n3. {Troisième étape}.",
      "image": "",
      "cta": "L'essayer maintenant",
      "url": "/app/"
     },
     {
      "title": "À quoi elle vous sert",
      "text": "{Un exemple concret : un cours, une réunion, une soutenance…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Dites-nous ce que vous en pensez avec « Signaler un problème » dans l'application."
   },
   "gl": {
    "subject": "Novo en Revela: {nome da función}",
    "preheader": "{Unha frase que explique que permite facer}",
    "eyebrow": "Nova función",
    "title": "{Nome da función}, *xa dispoñible*",
    "intro": "Ola:\n\nEngadimos {nome da función}: {que permite facer, nunha frase}.",
    "blocks": [
     {
      "title": "Como se usa",
      "text": "1. Abre {onde está}.\n\n2. {Segundo paso}.\n\n3. {Terceiro paso}.",
      "image": "",
      "cta": "Probalo agora",
      "url": "/app/"
     },
     {
      "title": "Para que che serve",
      "text": "{Un exemplo concreto: unha clase, unha reunión, unha defensa…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Cóntanos que che parece con «Informar dun problema» dentro da app."
   },
   "it": {
    "subject": "Novità in Revela: {nome della funzione}",
    "preheader": "{Una frase su cosa permette di fare}",
    "eyebrow": "Nuova funzione",
    "title": "{Nome della funzione}, *già disponibile*",
    "intro": "Ciao,\n\nabbiamo aggiunto {nome della funzione}: {cosa permette di fare, in una frase}.",
    "blocks": [
     {
      "title": "Come si usa",
      "text": "1. Apri {dove si trova}.\n\n2. {Secondo passo}.\n\n3. {Terzo passo}.",
      "image": "",
      "cta": "Provala ora",
      "url": "/app/"
     },
     {
      "title": "A cosa ti serve",
      "text": "{Un esempio concreto: una lezione, una riunione, una discussione di tesi…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Dicci cosa ne pensi con «Segnala un problema» nell'app."
   },
   "nl": {
    "subject": "Nieuw in Revela: {naam van de functie}",
    "preheader": "{Eén zin over wat je ermee kunt doen}",
    "eyebrow": "Nieuwe functie",
    "title": "{Naam van de functie}, *nu beschikbaar*",
    "intro": "Hoi:\n\nWe hebben {naam van de functie} toegevoegd: {wat je ermee kunt doen, in één zin}.",
    "blocks": [
     {
      "title": "Zo gebruik je het",
      "text": "1. Open {waar het zit}.\n\n2. {Tweede stap}.\n\n3. {Derde stap}.",
      "image": "",
      "cta": "Nu proberen",
      "url": "/app/"
     },
     {
      "title": "Waarvoor het dient",
      "text": "{Een concreet voorbeeld: een les, een vergadering, een verdediging…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Laat ons weten wat je ervan vindt via «Een probleem melden» in de app."
   },
   "pt": {
    "subject": "Novo no Revela: {nome da funcionalidade}",
    "preheader": "{Uma frase sobre o que permite fazer}",
    "eyebrow": "Funcionalidade nova",
    "title": "{Nome da funcionalidade}, *já disponível*",
    "intro": "Olá,\n\nacrescentámos {nome da funcionalidade}: {o que permite fazer, numa frase}.",
    "blocks": [
     {
      "title": "Como se usa",
      "text": "1. Abre {onde está}.\n\n2. {Segundo passo}.\n\n3. {Terceiro passo}.",
      "image": "",
      "cta": "Experimentar agora",
      "url": "/app/"
     },
     {
      "title": "Para que te serve",
      "text": "{Um exemplo concreto: uma aula, uma reunião, uma defesa…}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Diz-nos o que achas em «Comunicar um problema», dentro da app."
   }
  }
 },
 "templates": {
  "name": "Colección de plantillas nueva",
  "texts": {
   "es": {
    "subject": "{N} plantillas nuevas: {tema}",
    "preheader": "Presentaciones listas para usar",
    "eyebrow": "Plantillas nuevas",
    "title": "{N} presentaciones *nuevas* para {tema}",
    "intro": "Hola:\n\nHemos preparado una colección nueva: {tema}. Son presentaciones listas para usar, en 11 idiomas.",
    "blocks": [
     {
      "title": "Qué incluye",
      "text": "{Lista breve: portada, datos, actividades, diapositivas de respaldo…}",
      "image": "",
      "cta": "Ver la colección",
      "url": "/templates"
     },
     {
      "title": "Cómo empezar",
      "text": "Elige la que más se parezca a lo que necesitas y cámbiale los textos, los colores y las imágenes. Todo se puede editar.",
      "image": "",
      "cta": "Abrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "¿Echas en falta alguna? Dinos qué tema te vendría bien con «Informar de un problema» dentro de la app."
   },
   "en": {
    "subject": "{N} new templates: {topic}",
    "preheader": "Presentations ready to use",
    "eyebrow": "New templates",
    "title": "{N} *new* presentations for {topic}",
    "intro": "Hi:\n\nWe have prepared a new collection: {topic}. They are ready-to-use presentations, in 11 languages.",
    "blocks": [
     {
      "title": "What is inside",
      "text": "{Short list: cover, data, activities, backup slides…}",
      "image": "",
      "cta": "See the collection",
      "url": "/templates"
     },
     {
      "title": "How to start",
      "text": "Pick the one closest to what you need and change its texts, colours and images. Everything can be edited.",
      "image": "",
      "cta": "Open Revela",
      "url": "/app/"
     }
    ],
    "outro": "Missing one? Tell us which topic would help with “Report a problem” inside the app."
   },
   "ar": {
    "subject": "{N} قوالب جديدة: {الموضوع}",
    "preheader": "عروض جاهزة للاستخدام",
    "eyebrow": "قوالب جديدة",
    "title": "{N} عروض *جديدة* عن {الموضوع}",
    "intro": "مرحبًا:\n\nأعددنا مجموعة جديدة: {الموضوع}. هي عروض جاهزة للاستخدام بـ 11 لغة.",
    "blocks": [
     {
      "title": "ما الذي تتضمنه",
      "text": "{قائمة قصيرة: الغلاف، البيانات، الأنشطة، شرائح احتياطية…}",
      "image": "",
      "cta": "شاهد المجموعة",
      "url": "/templates"
     },
     {
      "title": "كيف تبدأ",
      "text": "اختر الأقرب إلى ما تحتاجه وغيّر نصوصه وألوانه وصوره. كل شيء قابل للتعديل.",
      "image": "",
      "cta": "افتح Revela",
      "url": "/app/"
     }
    ],
    "outro": "هل افتقدت قالبًا؟ أخبرنا بالموضوع الذي يلزمك عبر «الإبلاغ عن مشكلة» داخل التطبيق."
   },
   "ca": {
    "subject": "{N} plantilles noves: {tema}",
    "preheader": "Presentacions a punt per fer servir",
    "eyebrow": "Plantilles noves",
    "title": "{N} presentacions *noves* per a {tema}",
    "intro": "Hola:\n\nhem preparat una col·lecció nova: {tema}. Són presentacions a punt per fer servir, en 11 idiomes.",
    "blocks": [
     {
      "title": "Què inclou",
      "text": "{Llista breu: portada, dades, activitats, diapositives de reserva…}",
      "image": "",
      "cta": "Veure la col·lecció",
      "url": "/templates"
     },
     {
      "title": "Com començar",
      "text": "Tria la que s'assembli més al que necessites i canvia'n els textos, els colors i les imatges. Tot es pot editar.",
      "image": "",
      "cta": "Obre Revela",
      "url": "/app/"
     }
    ],
    "outro": "En trobes a faltar alguna? Digue'ns quin tema et aniria bé amb «Informa d'un problema» dins de l'app."
   },
   "de": {
    "subject": "{N} neue Vorlagen: {Thema}",
    "preheader": "Fertige Präsentationen zum Loslegen",
    "eyebrow": "Neue Vorlagen",
    "title": "{N} *neue* Präsentationen für {Thema}",
    "intro": "Guten Tag,\n\nwir haben eine neue Sammlung vorbereitet: {Thema}. Es sind fertige Präsentationen in 11 Sprachen.",
    "blocks": [
     {
      "title": "Was enthalten ist",
      "text": "{Kurze Liste: Titelfolie, Daten, Aktivitäten, Reservefolien…}",
      "image": "",
      "cta": "Sammlung ansehen",
      "url": "/templates"
     },
     {
      "title": "So fangen Sie an",
      "text": "Wählen Sie die Vorlage, die am besten zu Ihrem Bedarf passt, und ändern Sie Texte, Farben und Bilder. Alles lässt sich bearbeiten.",
      "image": "",
      "cta": "Revela öffnen",
      "url": "/app/"
     }
    ],
    "outro": "Fehlt Ihnen eine? Sagen Sie uns über „Problem melden“ in der App, welches Thema hilfreich wäre."
   },
   "eu": {
    "subject": "{N} txantiloi berri: {gaia}",
    "preheader": "Erabiltzeko prest dauden aurkezpenak",
    "eyebrow": "Txantiloi berriak",
    "title": "{N} aurkezpen *berri*: {gaia}",
    "intro": "Kaixo:\n\nBilduma berri bat prestatu dugu: {gaia}. Erabiltzeko prest dauden aurkezpenak dira, 11 hizkuntzatan.",
    "blocks": [
     {
      "title": "Zer dakar",
      "text": "{Zerrenda laburra: azala, datuak, jarduerak, babes-diapositibak…}",
      "image": "",
      "cta": "Bilduma ikusi",
      "url": "/templates"
     },
     {
      "title": "Nola hasi",
      "text": "Aukeratu behar duzunaren antzekoena eta aldatu testuak, koloreak eta irudiak. Dena editatu daiteke.",
      "image": "",
      "cta": "Revela ireki",
      "url": "/app/"
     }
    ],
    "outro": "Baten bat falta zaizu? Esaiguzu zer gai etorriko litzaizukeen ondo aplikazioaren barruko «Arazo baten berri eman» erabiliz."
   },
   "fr": {
    "subject": "{N} nouveaux modèles : {thème}",
    "preheader": "Des présentations prêtes à l'emploi",
    "eyebrow": "Nouveaux modèles",
    "title": "{N} *nouvelles* présentations pour {thème}",
    "intro": "Bonjour,\n\nNous avons préparé une nouvelle collection : {thème}. Ce sont des présentations prêtes à l'emploi, en 11 langues.",
    "blocks": [
     {
      "title": "Ce qu'elle contient",
      "text": "{Liste courte : couverture, données, activités, diapositives de secours…}",
      "image": "",
      "cta": "Voir la collection",
      "url": "/templates"
     },
     {
      "title": "Par où commencer",
      "text": "Choisissez celle qui ressemble le plus à ce dont vous avez besoin et modifiez ses textes, ses couleurs et ses images. Tout est modifiable.",
      "image": "",
      "cta": "Ouvrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "Il en manque une ? Dites-nous quel thème vous serait utile avec « Signaler un problème » dans l'application."
   },
   "gl": {
    "subject": "{N} modelos novos: {tema}",
    "preheader": "Presentacións listas para usar",
    "eyebrow": "Modelos novos",
    "title": "{N} presentacións *novas* para {tema}",
    "intro": "Ola:\n\nPreparamos unha colección nova: {tema}. Son presentacións listas para usar, en 11 idiomas.",
    "blocks": [
     {
      "title": "Que inclúe",
      "text": "{Lista breve: portada, datos, actividades, diapositivas de apoio…}",
      "image": "",
      "cta": "Ver a colección",
      "url": "/templates"
     },
     {
      "title": "Como comezar",
      "text": "Escolle a que máis se pareza ao que precisas e cambia os textos, as cores e as imaxes. Todo se pode editar.",
      "image": "",
      "cta": "Abrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "Botas algunha en falta? Dinos que tema che virían ben con «Informar dun problema» dentro da app."
   },
   "it": {
    "subject": "{N} nuovi modelli: {argomento}",
    "preheader": "Presentazioni pronte all'uso",
    "eyebrow": "Nuovi modelli",
    "title": "{N} *nuove* presentazioni per {argomento}",
    "intro": "Ciao,\n\nabbiamo preparato una nuova raccolta: {argomento}. Sono presentazioni pronte all'uso, in 11 lingue.",
    "blocks": [
     {
      "title": "Cosa include",
      "text": "{Elenco breve: copertina, dati, attività, diapositive di riserva…}",
      "image": "",
      "cta": "Vedi la raccolta",
      "url": "/templates"
     },
     {
      "title": "Come iniziare",
      "text": "Scegli quella più vicina a ciò che ti serve e cambia testi, colori e immagini. Tutto si può modificare.",
      "image": "",
      "cta": "Apri Revela",
      "url": "/app/"
     }
    ],
    "outro": "Ne manca una? Dicci quale argomento ti sarebbe utile con «Segnala un problema» nell'app."
   },
   "nl": {
    "subject": "{N} nieuwe sjablonen: {onderwerp}",
    "preheader": "Presentaties die klaar zijn voor gebruik",
    "eyebrow": "Nieuwe sjablonen",
    "title": "{N} *nieuwe* presentaties voor {onderwerp}",
    "intro": "Hoi:\n\nWe hebben een nieuwe collectie voorbereid: {onderwerp}. Het zijn kant-en-klare presentaties, in 11 talen.",
    "blocks": [
     {
      "title": "Wat zit erin",
      "text": "{Korte lijst: omslag, gegevens, activiteiten, reserveslides…}",
      "image": "",
      "cta": "De collectie bekijken",
      "url": "/templates"
     },
     {
      "title": "Zo begin je",
      "text": "Kies degene die het best past bij wat je nodig hebt en pas de teksten, kleuren en afbeeldingen aan. Alles is te bewerken.",
      "image": "",
      "cta": "Revela openen",
      "url": "/app/"
     }
    ],
    "outro": "Mis je er een? Laat ons via «Een probleem melden» in de app weten welk onderwerp je zou helpen."
   },
   "pt": {
    "subject": "{N} modelos novos: {tema}",
    "preheader": "Apresentações prontas a usar",
    "eyebrow": "Modelos novos",
    "title": "{N} apresentações *novas* para {tema}",
    "intro": "Olá,\n\npreparámos uma coleção nova: {tema}. São apresentações prontas a usar, em 11 idiomas.",
    "blocks": [
     {
      "title": "O que inclui",
      "text": "{Lista breve: capa, dados, atividades, diapositivos de reserva…}",
      "image": "",
      "cta": "Ver a coleção",
      "url": "/templates"
     },
     {
      "title": "Como começar",
      "text": "Escolhe a que mais se parece com o que precisas e muda-lhe os textos, as cores e as imagens. Tudo se pode editar.",
      "image": "",
      "cta": "Abrir o Revela",
      "url": "/app/"
     }
    ],
    "outro": "Falta alguma? Diz-nos que tema te seria útil em «Comunicar um problema», dentro da app."
   }
  }
 },
 "tip": {
  "name": "Un consejo",
  "texts": {
   "es": {
    "subject": "Un truco para presentar mejor: {título del truco}",
    "preheader": "Se aprende en un minuto",
    "eyebrow": "Consejo",
    "title": "Un truco para *presentar* mejor",
    "intro": "Hola:\n\n{Una frase que cuente por qué merece la pena este truco.}",
    "blocks": [
     {
      "title": "El truco",
      "text": "{Explica el truco en tres o cuatro frases.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Pruébalo en un minuto",
      "text": "Abre una presentación y {haz esto}.",
      "image": "",
      "cta": "Abrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "¿Quieres aprender más? Hay tutoriales interactivos en Ver ▸ Ayuda ▸ Tutorial interactivo."
   },
   "en": {
    "subject": "A trick to present better: {trick title}",
    "preheader": "You learn it in a minute",
    "eyebrow": "Tip",
    "title": "A trick to *present* better",
    "intro": "Hi:\n\n{One sentence on why this trick is worth it.}",
    "blocks": [
     {
      "title": "The trick",
      "text": "{Explain the trick in three or four sentences.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Try it in a minute",
      "text": "Open a presentation and {do this}.",
      "image": "",
      "cta": "Open Revela",
      "url": "/app/"
     }
    ],
    "outro": "Want to learn more? There are interactive tutorials in View ▸ Help ▸ Interactive tutorial."
   },
   "ar": {
    "subject": "حيلة لتقديم أفضل: {عنوان الحيلة}",
    "preheader": "تتعلمها في دقيقة",
    "eyebrow": "نصيحة",
    "title": "حيلة *لتقدّم* بشكل أفضل",
    "intro": "مرحبًا:\n\n{جملة واحدة عن سبب أهمية هذه الحيلة.}",
    "blocks": [
     {
      "title": "الحيلة",
      "text": "{اشرح الحيلة في ثلاث أو أربع جمل.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "جرّبها في دقيقة",
      "text": "افتح عرضًا و{افعل هذا}.",
      "image": "",
      "cta": "افتح Revela",
      "url": "/app/"
     }
    ],
    "outro": "هل تريد أن تتعلم أكثر؟ هناك أدلة تفاعلية في عرض ▸ تعليمات ▸ دليل تفاعلي."
   },
   "ca": {
    "subject": "Un truc per presentar millor: {títol del truc}",
    "preheader": "S'aprèn en un minut",
    "eyebrow": "Consell",
    "title": "Un truc per *presentar* millor",
    "intro": "Hola:\n\n{Una frase que expliqui per què val la pena aquest truc.}",
    "blocks": [
     {
      "title": "El truc",
      "text": "{Explica el truc en tres o quatre frases.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Prova-ho en un minut",
      "text": "Obre una presentació i {fes això}.",
      "image": "",
      "cta": "Obre Revela",
      "url": "/app/"
     }
    ],
    "outro": "Vols aprendre més? Hi ha tutorials interactius a Visualitza ▸ Ajuda ▸ Tutorial interactiu."
   },
   "de": {
    "subject": "Ein Trick für bessere Präsentationen: {Titel des Tricks}",
    "preheader": "In einer Minute gelernt",
    "eyebrow": "Tipp",
    "title": "Ein Trick, um besser zu *präsentieren*",
    "intro": "Guten Tag,\n\n{Ein Satz dazu, warum sich dieser Trick lohnt.}",
    "blocks": [
     {
      "title": "Der Trick",
      "text": "{Erklären Sie den Trick in drei oder vier Sätzen.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "In einer Minute ausprobiert",
      "text": "Öffnen Sie eine Präsentation und {tun Sie Folgendes}.",
      "image": "",
      "cta": "Revela öffnen",
      "url": "/app/"
     }
    ],
    "outro": "Möchten Sie mehr lernen? Es gibt interaktive Tutorials unter Ansicht ▸ Hilfe ▸ Interaktives Tutorial."
   },
   "eu": {
    "subject": "Hobeto aurkezteko trikimailu bat: {trikimailuaren izenburua}",
    "preheader": "Minutu batean ikasten da",
    "eyebrow": "Aholkua",
    "title": "Hobeto *aurkezteko* trikimailu bat",
    "intro": "Kaixo:\n\n{Trikimailu honek zergatik merezi duen azaltzen duen esaldi bat.}",
    "blocks": [
     {
      "title": "Trikimailua",
      "text": "{Azaldu trikimailua hiru edo lau esalditan.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Probatu minutu batean",
      "text": "Ireki aurkezpen bat eta {egin hau}.",
      "image": "",
      "cta": "Revela ireki",
      "url": "/app/"
     }
    ],
    "outro": "Gehiago ikasi nahi duzu? Tutorial interaktiboak daude Ikusi ▸ Laguntza ▸ Tutorial interaktiboa atalean."
   },
   "fr": {
    "subject": "Une astuce pour mieux présenter : {titre de l'astuce}",
    "preheader": "On l'apprend en une minute",
    "eyebrow": "Astuce",
    "title": "Une astuce pour mieux *présenter*",
    "intro": "Bonjour,\n\n{Une phrase qui explique pourquoi cette astuce vaut la peine.}",
    "blocks": [
     {
      "title": "L'astuce",
      "text": "{Expliquez l'astuce en trois ou quatre phrases.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Essayez-la en une minute",
      "text": "Ouvrez une présentation et {faites ceci}.",
      "image": "",
      "cta": "Ouvrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "Envie d'en savoir plus ? Il y a des tutoriels interactifs dans Affichage ▸ Aide ▸ Tutoriel interactif."
   },
   "gl": {
    "subject": "Un truco para presentar mellor: {título do truco}",
    "preheader": "Apréndese nun minuto",
    "eyebrow": "Consello",
    "title": "Un truco para *presentar* mellor",
    "intro": "Ola:\n\n{Unha frase que conte por que merece a pena este truco.}",
    "blocks": [
     {
      "title": "O truco",
      "text": "{Explica o truco en tres ou catro frases.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Próbao nun minuto",
      "text": "Abre unha presentación e {fai isto}.",
      "image": "",
      "cta": "Abrir Revela",
      "url": "/app/"
     }
    ],
    "outro": "Queres aprender máis? Hai titoriais interactivos en Ver ▸ Axuda ▸ Titorial interactivo."
   },
   "it": {
    "subject": "Un trucco per presentare meglio: {titolo del trucco}",
    "preheader": "Si impara in un minuto",
    "eyebrow": "Consiglio",
    "title": "Un trucco per *presentare* meglio",
    "intro": "Ciao,\n\n{Una frase che spieghi perché vale la pena questo trucco.}",
    "blocks": [
     {
      "title": "Il trucco",
      "text": "{Spiega il trucco in tre o quattro frasi.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Provalo in un minuto",
      "text": "Apri una presentazione e {fai questo}.",
      "image": "",
      "cta": "Apri Revela",
      "url": "/app/"
     }
    ],
    "outro": "Vuoi imparare di più? Ci sono tutorial interattivi in Visualizza ▸ Aiuto ▸ Tutorial interattivo."
   },
   "nl": {
    "subject": "Een trucje om beter te presenteren: {titel van het trucje}",
    "preheader": "Je leert het in een minuut",
    "eyebrow": "Tip",
    "title": "Een trucje om beter te *presenteren*",
    "intro": "Hoi:\n\n{Eén zin over waarom dit trucje de moeite waard is.}",
    "blocks": [
     {
      "title": "Het trucje",
      "text": "{Leg het trucje uit in drie of vier zinnen.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Probeer het in een minuut",
      "text": "Open een presentatie en {doe dit}.",
      "image": "",
      "cta": "Revela openen",
      "url": "/app/"
     }
    ],
    "outro": "Wil je meer leren? Er zijn interactieve rondleidingen onder Beeld ▸ Help ▸ Interactieve rondleiding."
   },
   "pt": {
    "subject": "Um truque para apresentar melhor: {título do truque}",
    "preheader": "Aprende-se num minuto",
    "eyebrow": "Dica",
    "title": "Um truque para *apresentar* melhor",
    "intro": "Olá,\n\n{Uma frase a explicar por que vale a pena este truque.}",
    "blocks": [
     {
      "title": "O truque",
      "text": "{Explica o truque em três ou quatro frases.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Experimenta num minuto",
      "text": "Abre uma apresentação e {faz isto}.",
      "image": "",
      "cta": "Abrir o Revela",
      "url": "/app/"
     }
    ],
    "outro": "Queres aprender mais? Há tutoriais interativos em Ver ▸ Ajuda ▸ Tutorial interativo."
   }
  }
 },
 "notice": {
  "name": "Aviso importante",
  "texts": {
   "es": {
    "subject": "Un cambio en Revela: {qué cambia}",
    "preheader": "Léelo si usas {función o plan}",
    "eyebrow": "Aviso",
    "title": "{Qué cambia} a partir del *{fecha}*",
    "intro": "Hola:\n\nTe escribimos para avisarte de que {qué cambia y desde cuándo}.",
    "blocks": [
     {
      "title": "Qué significa para ti",
      "text": "{Qué tienes que hacer o, si es el caso, que no tienes que hacer nada.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Por qué lo hacemos",
      "text": "{El motivo, en dos frases.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Si tienes dudas, usa «Informar de un problema» dentro de la app: te respondemos por correo."
   },
   "en": {
    "subject": "A change in Revela: {what changes}",
    "preheader": "Read it if you use {feature or plan}",
    "eyebrow": "Notice",
    "title": "{What changes} from *{date}*",
    "intro": "Hi:\n\nWe are writing to let you know that {what changes and from when}.",
    "blocks": [
     {
      "title": "What it means for you",
      "text": "{What you need to do or, if so, that you need to do nothing.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Why we are doing it",
      "text": "{The reason, in two sentences.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "If you have questions, use “Report a problem” inside the app: we will answer by email."
   },
   "ar": {
    "subject": "تغيير في Revela: {ما الذي يتغير}",
    "preheader": "اقرأه إن كنت تستخدم {الميزة أو الخطة}",
    "eyebrow": "تنبيه",
    "title": "{ما الذي يتغير} اعتبارًا من *{التاريخ}*",
    "intro": "مرحبًا:\n\nنكتب إليك لنخبرك أن {ما الذي يتغير ومنذ متى}.",
    "blocks": [
     {
      "title": "ماذا يعني لك",
      "text": "{ما عليك فعله، أو، إن كان الأمر كذلك، أنه لا شيء عليك فعله.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "لماذا نفعل ذلك",
      "text": "{السبب، في جملتين.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "إن كانت لديك أسئلة، استخدم «الإبلاغ عن مشكلة» داخل التطبيق: نجيبك بالبريد الإلكتروني."
   },
   "ca": {
    "subject": "Un canvi a Revela: {què canvia}",
    "preheader": "Llegeix-ho si fas servir {funció o pla}",
    "eyebrow": "Avís",
    "title": "{Què canvia} a partir del *{data}*",
    "intro": "Hola:\n\nt'escrivim per avisar-te que {què canvia i des de quan}.",
    "blocks": [
     {
      "title": "Què significa per a tu",
      "text": "{Què has de fer o, si és el cas, que no has de fer res.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Per què ho fem",
      "text": "{El motiu, en dues frases.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Si tens dubtes, fes servir «Informa d'un problema» dins de l'app: et responem per correu."
   },
   "de": {
    "subject": "Eine Änderung bei Revela: {was sich ändert}",
    "preheader": "Lesen Sie dies, wenn Sie {Funktion oder Tarif} nutzen",
    "eyebrow": "Hinweis",
    "title": "{Was sich ändert} ab dem *{Datum}*",
    "intro": "Guten Tag,\n\nwir schreiben Ihnen, um Sie darüber zu informieren, dass {was sich ändert und ab wann}.",
    "blocks": [
     {
      "title": "Was das für Sie bedeutet",
      "text": "{Was Sie tun müssen oder gegebenenfalls, dass Sie nichts tun müssen.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Warum wir es tun",
      "text": "{Der Grund, in zwei Sätzen.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Bei Fragen nutzen Sie „Problem melden“ in der App: Wir antworten per E-Mail."
   },
   "eu": {
    "subject": "Aldaketa bat Revelan: {zer aldatzen den}",
    "preheader": "Irakurri {funtzioa edo plana} erabiltzen baduzu",
    "eyebrow": "Abisua",
    "title": "Aldaketa: {zer aldatzen den}. Noiztik: *{data}*",
    "intro": "Kaixo:\n\nHonen berri emateko idazten dizugu: {zer aldatzen den eta noiztik}.",
    "blocks": [
     {
      "title": "Zer esan nahi dizun",
      "text": "{Zer egin behar duzun edo, hala bada, ez duzula ezer egin behar.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Zergatik egiten dugun",
      "text": "{Arrazoia, bi esalditan.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Zalantzarik baduzu, erabili aplikazioaren barruko «Arazo baten berri eman»: posta elektronikoz erantzungo dizugu."
   },
   "fr": {
    "subject": "Un changement dans Revela : {ce qui change}",
    "preheader": "À lire si vous utilisez {fonction ou formule}",
    "eyebrow": "Avis",
    "title": "{Ce qui change} à partir du *{date}*",
    "intro": "Bonjour,\n\nNous vous écrivons pour vous prévenir que {ce qui change et à partir de quand}.",
    "blocks": [
     {
      "title": "Ce que cela signifie pour vous",
      "text": "{Ce que vous devez faire ou, le cas échéant, que vous n'avez rien à faire.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Pourquoi nous le faisons",
      "text": "{La raison, en deux phrases.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Si vous avez des questions, utilisez « Signaler un problème » dans l'application : nous vous répondrons par e-mail."
   },
   "gl": {
    "subject": "Un cambio en Revela: {que cambia}",
    "preheader": "Léeo se usas {función ou plan}",
    "eyebrow": "Aviso",
    "title": "{Que cambia} a partir do *{data}*",
    "intro": "Ola:\n\nEscribímosche para avisarte de que {que cambia e desde cando}.",
    "blocks": [
     {
      "title": "Que significa para ti",
      "text": "{Que tes que facer ou, se é o caso, que non tes que facer nada.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Por que o facemos",
      "text": "{O motivo, en dúas frases.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Se tes dúbidas, usa «Informar dun problema» dentro da app: respondémosche por correo."
   },
   "it": {
    "subject": "Un cambiamento in Revela: {cosa cambia}",
    "preheader": "Leggilo se usi {funzione o piano}",
    "eyebrow": "Avviso",
    "title": "{Cosa cambia} a partire dal *{data}*",
    "intro": "Ciao,\n\nti scriviamo per avvisarti che {cosa cambia e da quando}.",
    "blocks": [
     {
      "title": "Cosa significa per te",
      "text": "{Cosa devi fare o, se è il caso, che non devi fare nulla.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Perché lo facciamo",
      "text": "{Il motivo, in due frasi.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Se hai dubbi, usa «Segnala un problema» nell'app: ti rispondiamo per e-mail."
   },
   "nl": {
    "subject": "Een wijziging in Revela: {wat verandert}",
    "preheader": "Lees het als je {functie of abonnement} gebruikt",
    "eyebrow": "Mededeling",
    "title": "{Wat verandert} vanaf *{datum}*",
    "intro": "Hoi:\n\nWe schrijven je om te laten weten dat {wat verandert en vanaf wanneer}.",
    "blocks": [
     {
      "title": "Wat het voor jou betekent",
      "text": "{Wat je moet doen of, als dat zo is, dat je niets hoeft te doen.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Waarom we het doen",
      "text": "{De reden, in twee zinnen.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Heb je vragen, gebruik dan «Een probleem melden» in de app: we antwoorden per e-mail."
   },
   "pt": {
    "subject": "Uma mudança no Revela: {o que muda}",
    "preheader": "Lê isto se usas {funcionalidade ou plano}",
    "eyebrow": "Aviso",
    "title": "{O que muda} a partir de *{data}*",
    "intro": "Olá,\n\nescrevemos para te avisar de que {o que muda e desde quando}.",
    "blocks": [
     {
      "title": "O que significa para ti",
      "text": "{O que tens de fazer ou, se for o caso, que não tens de fazer nada.}",
      "image": "",
      "cta": "",
      "url": ""
     },
     {
      "title": "Porque o fazemos",
      "text": "{O motivo, em duas frases.}",
      "image": "",
      "cta": "",
      "url": ""
     }
    ],
    "outro": "Se tiveres dúvidas, usa «Comunicar um problema» dentro da app: respondemos por e-mail."
   }
  }
 }
};
