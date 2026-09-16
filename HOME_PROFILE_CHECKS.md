# Home a Profil – kontrola v Android APK

Táto úprava dokončuje zostávajúce pripomienky k Home a Profilu. Zachováva štyri záložky, mapu, spoločný formulár, lokálne dáta a existujúce odsadenie od systémových panelov.

- Home: vycentrovaný symbol kompasu, TravelLog a slogan „Tvoje miesta. Tvoje príbehy.“
- Návštevy otvoria Trips, Krajiny otvoria Map. Priemerné hodnotenie je obyčajný text, nevyzerá ako tlačidlo.
- Nejasná „Obľúbená lokalita“ už nie je na Home ani v Profile.
- Posledné návštevy majú samostatné karty. Ťuknutie otvorí detail; úprava a vymazanie používajú existujúce služby a formulár.
- Profil: iniciály, meno, email, odkazy na návštevy a mapu, sekcia o lokálnych dátach a odhlásenie s ošetrením chyby.
- Označenie „Testovacia verzia“ zodpovedá aktuálnemu testovaciemu prihláseniu. Obrazovky nesľubujú aktívne predplatné ani synchronizáciu.

## Overiť na telefóne

1. Horná značka ani dolné ovládanie nezasahujú do systémových panelov. Obidve obrazovky sa dajú posúvať aj pri väčšom písme.
2. Odkazy Návštevy, Krajiny a Zobraziť všetky otvárajú správne záložky.
3. Otvor poslednú návštevu, uprav jej názov, ulož a skontroluj kartu aj Trips. Zrušenie formulára nič nemení.
4. Vymazanie vyžaduje potvrdenie a upraví zoznam aj počítadlá. Zrušenie potvrdenia záznam zachová.
5. Over nulový počet návštev, dlhý názov/lokalitu a dlhý email. Iniciály nesmú nahrádzať skutočne uložené meno.
6. Odhlásenie funguje; opätovné prihlásenie pod rovnakým testovacím účtom zachová lokálne návštevy.

Overené v pracovnom prostredí: syntax JSX, existujúce názvy ikon a napojenie na rozhrania navigácie, kontextu a modálov. EAS build a vizuálna kontrola na Android zariadení ešte neprebehli.

Ďalší funkčný celok: skutočné používateľské účty, záloha návštev a obnovenie pri zmene telefónu. Vyžaduje dokončenie Firebase konfigurácie a migráciu existujúcich lokálnych dát; táto dizajnová úprava ho nezapína.
