/* ================================================================
   ÉTLAP SZŰRŐ
   ================================================================
   A szűrés 4 szempont szerint történik EGYSZERRE, egymásra épülve
   (AND kapcsolat a szempontok között, OR kapcsolat az egy csoporton
   belül kiválasztott jelölőnégyzetek között):

     1. Ár intervallum (tól-ig)         -> data-price
     2. Allergének kizárása             -> data-tags (gluten, tej, tojas...)
     3. Jelleg (vegán és/vagy csípős)   -> data-tags (vegan, csipos)
     4. Kategória (leves, pizza, stb.)  -> a .meal doboz id-je

   Algoritmus:
   1. Az oldal betöltésekor beolvassuk a DOM-ból az összes terméket
      (.product), és ezekből dinamikusan felépítjük a szűrő felületet:
      - legkisebb/legnagyobb ár a data-price attribútumokból,
      - az összes előforduló tag a data-tags attribútumokból (ebből
        a "vegan" és "csipos" a Jelleg csoportba kerül, a többi
        (gluten, tej, tojas...) az Allergének csoportba),
      - a kategóriák a .meal dobozok id-jéből és h2 szövegéből.
      Ezért a szűrő akkor is működik, ha a termékadatok egy CMS-ből
      generálódnak és bővülnek/változnak.
   2. Minden szűrőelem change/input eseményére lefut az applyFilters()
      függvény, amely végigmegy MINDEN terméken, és a fenti 4 feltétel
      egyidejű (AND) teljesülése alapján dönti el, hogy látszódjon-e.
   3. Ha egy kategórián (.meal) belül egyetlen termék sem látható,
      az egész kategória (a címével együtt) elrejtjük.
   4. Ha semmi nem felel meg a szűrésnek, megjelenítünk egy üzenetet.
   ================================================================ */

$(document).ready(function ($) {

	var $products = $('.product');
	var $meals = $('.meal');

	// Az allergén/jelleg tag-ekhez tartozó magyar címkék és (ha van) a
	// meglévő CSS-ben már definiált színes ikon-osztály neve.
	var tagCimkek = {
		vegan: 'Vegán',
		csipos: 'Csípős',
		gluten: 'Glutén',
		tej: 'Tejtermék',
		tojas: 'Tojás'
	};

	// Ezek a tag-ek számítanak "jellegnek", minden más automatikusan
	// "allergénnek" minősül - így ha a CMS új allergén tag-et vezet be,
	// azt is felismeri a szűrő anélkül, hogy a kódot módosítani kéne.
	var jellegTagNevek = ['vegan', 'csipos'];

	/* ------------------------------------------------------------
	   1. lépés: adatok kiolvasása a DOM-ból
	   ------------------------------------------------------------ */

	function termekTagjei($termek) {
		var nyers = ($termek.data('tags') || '').toString().trim();
		return nyers === '' ? [] : nyers.split(/\s+/);
	}

	var arak = $products.map(function () {
		return parseInt($(this).data('price'), 10);
	}).get();

	var minAr = Math.min.apply(null, arak);
	var maxAr = Math.max.apply(null, arak);

	var osszesTagSet = {};
	$products.each(function () {
		termekTagjei($(this)).forEach(function (tag) {
			osszesTagSet[tag] = true;
		});
	});

	var jellegTagok = jellegTagNevek.filter(function (tag) { return osszesTagSet[tag]; });
	var allergenTagok = Object.keys(osszesTagSet)
		.filter(function (tag) { return jellegTagNevek.indexOf(tag) === -1; })
		.sort();

	var kategoriak = [];
	$meals.each(function () {
		kategoriak.push({
			id: $(this).attr('id'),
			nev: $.trim($(this).find('h2').first().text())
		});
	});

	console.log('Ár tartomány:', minAr, '-', maxAr);
	console.log('Allergén tagek:', allergenTagok);
	console.log('Jelleg tagek:', jellegTagok);
	console.log('Kategóriák:', kategoriak);

	/* ------------------------------------------------------------
	   2. lépés: a szűrő felület felépítése
	   ------------------------------------------------------------ */

	function checkboxSor(cssOsztaly, ertek, cimke, ikonOsztaly) {
		var ikon = ikonOsztaly ? '<span class="' + ikonOsztaly + '"></span>' : '';
		return '<label class="szuro-cimke">' +
			'<input type="checkbox" class="' + cssOsztaly + '" value="' + ertek + '">' +
			ikon + '<span>' + cimke + '</span>' +
			'</label>';
	}

	var html = '';

	// --- Ár intervallum ---
	html += '<div class="szuro-csoport">';
	html += '<strong>Ár (Ft)</strong>';
	html += '<div class="ar-kijelzo"><span id="ar-tol-kijelzo"></span> Ft &ndash; <span id="ar-ig-kijelzo"></span> Ft</div>';
	html += '<div class="range-slider">';
	html += '<div class="range-track"></div>';
	html += '<div class="range-track-fill" id="ar-fill"></div>';
	html += '<input type="range" id="ar-tol" min="' + minAr + '" max="' + maxAr + '" value="' + minAr + '" step="5">';
	html += '<input type="range" id="ar-ig" min="' + minAr + '" max="' + maxAr + '" value="' + maxAr + '" step="5">';
	html += '</div>';
	html += '</div>';

	// --- Allergének kizárása ---
	if (allergenTagok.length) {
		html += '<div class="szuro-csoport">';
		html += '<strong>Allergének kizárása</strong>';
		allergenTagok.forEach(function (tag) {
			html += checkboxSor('szuro-allergen', tag, tagCimkek[tag] || tag, tag);
		});
		html += '</div>';
	}

	// --- Jelleg (vegán / csípős) ---
	if (jellegTagok.length) {
		html += '<div class="szuro-csoport">';
		html += '<strong>Jelleg</strong>';
		jellegTagok.forEach(function (tag) {
			html += checkboxSor('szuro-jelleg', tag, tagCimkek[tag] || tag, tag);
		});
		html += '</div>';
	}

	// --- Kategória ---
	html += '<div class="szuro-csoport">';
	html += '<strong>Kategória</strong>';
	kategoriak.forEach(function (kat) {
		html += checkboxSor('szuro-kategoria', kat.id, kat.nev, null);
	});
	html += '</div>';

	html += '<button type="button" id="szuro-reset">Szűrés törlése</button>';
	html += '<p class="talalatok-szama" id="talalatok-szama"></p>';

	$('#filter').append(html);

	/* ------------------------------------------------------------
	   3. lépés: a dupla ár-csúszka viselkedése
	   ------------------------------------------------------------ */

	function arCsuszkaFrissit() {
		var tol = parseInt($('#ar-tol').val(), 10);
		var ig = parseInt($('#ar-ig').val(), 10);

		// a két csúszka ne csússzon át egymáson
		if (tol > ig) {
			var csere = tol;
			tol = ig;
			ig = csere;
		}

		$('#ar-tol-kijelzo').text(tol.toLocaleString('hu-HU'));
		$('#ar-ig-kijelzo').text(ig.toLocaleString('hu-HU'));

		var tartomany = maxAr - minAr || 1;
		var balSzazalek = ((tol - minAr) / tartomany) * 100;
		var jobbSzazalek = ((ig - minAr) / tartomany) * 100;
		$('#ar-fill').css({ left: balSzazalek + '%', right: (100 - jobbSzazalek) + '%' });
	}

	$('#ar-tol, #ar-ig').on('input', function () {
		// a "tól" csúszka ne mehessen az "ig" csúszka fölé, és fordítva
		var tol = parseInt($('#ar-tol').val(), 10);
		var ig = parseInt($('#ar-ig').val(), 10);
		if (tol > ig) {
			if (this.id === 'ar-tol') { $('#ar-tol').val(ig); }
			else { $('#ar-ig').val(tol); }
		}
		arCsuszkaFrissit();
		alkalmazSzuro();
	});

	arCsuszkaFrissit();

	/* ------------------------------------------------------------
	   4. lépés: a tényleges szűrés
	   ------------------------------------------------------------ */

	function alkalmazSzuro() {
		var arTol = parseInt($('#ar-tol').val(), 10);
		var arIg = parseInt($('#ar-ig').val(), 10);
		if (arTol > arIg) { var t = arTol; arTol = arIg; arIg = t; }

		var kizartAllergenek = $('.szuro-allergen:checked').map(function () { return this.value; }).get();
		var valasztottJellegek = $('.szuro-jelleg:checked').map(function () { return this.value; }).get();
		var valasztottKategoriak = $('.szuro-kategoria:checked').map(function () { return this.value; }).get();

		console.log('Aktív szűrők ->', {
			ar: [arTol, arIg],
			kizartAllergenek: kizartAllergenek,
			valasztottJellegek: valasztottJellegek,
			valasztottKategoriak: valasztottKategoriak
		});

		var lathatoSzamlalo = 0;

		$products.each(function () {
			var $termek = $(this);
			var ar = parseInt($termek.data('price'), 10);
			var tagek = termekTagjei($termek);
			var kategoriaId = $termek.closest('.meal').attr('id');

			// 1) ár intervallumon belül van-e
			var arMegfelel = ar >= arTol && ar <= arIg;

			// 2) egyik kizárt allergént SEM tartalmazza
			var allergenMegfelel = kizartAllergenek.every(function (tag) {
				return tagek.indexOf(tag) === -1;
			});

			// 3) ha van kiválasztott jelleg, legalább az egyiknek meg kell felelnie (OR)
			var jellegMegfelel = valasztottJellegek.length === 0 ||
				valasztottJellegek.some(function (tag) { return tagek.indexOf(tag) !== -1; });

			// 4) ha van kiválasztott kategória, a termék kategóriájának köztük kell lennie (OR)
			var kategoriaMegfelel = valasztottKategoriak.length === 0 ||
				valasztottKategoriak.indexOf(kategoriaId) !== -1;

			var lathato = arMegfelel && allergenMegfelel && jellegMegfelel && kategoriaMegfelel;

			$termek.toggleClass('szurt-elrejtve', !lathato);
			if (lathato) { lathatoSzamlalo++; }
		});

		// üres kategóriák (címükkel együtt) elrejtése
		$meals.each(function () {
			var $meal = $(this);
			var vanLathatoTermek = $meal.find('.product').not('.szurt-elrejtve').length > 0;
			$meal.toggleClass('szurt-elrejtve', !vanLathatoTermek);
		});

		$('#nincs-talalat').toggle(lathatoSzamlalo === 0);
		$('#talalatok-szama').text(lathatoSzamlalo + ' étel felel meg a szűrésnek.');
	}

	// minden checkbox változásra újraszűrünk
	$('#filter').on('change', '.szuro-allergen, .szuro-jelleg, .szuro-kategoria', alkalmazSzuro);

	// szűrés törlése -> alapállapot visszaállítása
	$('#szuro-reset').on('click', function () {
		$('#ar-tol').val(minAr);
		$('#ar-ig').val(maxAr);
		arCsuszkaFrissit();
		$('.szuro-allergen, .szuro-jelleg, .szuro-kategoria').prop('checked', false);
		alkalmazSzuro();
	});

	// kezdeti (szűretlen) állapot kirajzolása
	alkalmazSzuro();

});
