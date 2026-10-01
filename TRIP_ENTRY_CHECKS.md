# Kontrola navigácie a máp na Android APK

Automatická kontrola: `node tests/map-navigation.test.mjs` a `node tests/place-search.test.mjs`.
Overuje počítanie krajín, geometriu, pobrežné body, priblíženie, skupiny, dátumovú hranicu a názov pri zmene polohy.
Celé Android zostavenie a vizuálna kontrola zostávajú na EAS a telefóne.

## Čo overiť v APK

1. Spodné menu má iba Home, Trips, Map a Profile. Samostatné Add Trip už nie je v navigácii.
2. Home aj Trips majú tlačidlo + Pridať návštevu, ktoré otvorí spoločný formulár s mapou. Uloženie sa prejaví v zozname aj na mape. Zrušenie nič neuloží.
3. Map má rovnakú akciu. Vybraný bod sa prevezme do formulára; bez výberu možno polohu vybrať až vo formulári.
4. Pohľad na Európu zobrazuje bodovú heat mapu bez špendlíkov. Krajiny sa nevyfarbujú. Hustota závisí od počtu návštev, nie od hodnotenia.
5. Heat mapa zostáva viditeľná na všetkých priblíženiach, aj pod skupinami a jednotlivými špendlíkmi. Over aj satelitný režim, pridanie a vymazanie návštevy a prázdnu mapu.
6. Priblíženie na krajinu/región zobrazí skupiny s počtom. Ťuknutie na skupinu mapu priblíži; skupina návštev s rovnakými súradnicami otvorí zoznam.
7. Pri priblížení na mesto sa zobrazia jednotlivé značky. Oddialením sa opäť zoskupia a pri pohľade na kontinent zmiznú.
8. Prepínač Mapa/Satelit funguje na hlavnej mape aj vo formulári. Satelit používa hybridný režim s popiskami. Prepnutie nesmie zmeniť výber polohy ani rozpracovaný formulár.
9. Vyber Nemocnicu, potom nepomenovaný bod: názov musí zostať prázdny a vyžaduje ručné doplnenie. Potom vyber Zoo: názov musí byť Zoo. Otestuj aj presunutie značky.
10. Po výbere nepomenovaného bodu začni písať vlastný názov. Neskorá odpoveď GeoNames ho nesmie prepísať. Rýchly výber dvoch miest nesmie vrátiť údaje prvého miesta.
11. Zachované: odsadenie od kamery a systémových tlačidiel, radenie rovnakého dňa podľa času vytvorenia, fotografie pri úprave, validácia polohy/dátumu a ochrana pred dvojitým uložením.
12. Nainštaluj APK ako aktualizáciu existujúcej aplikácie; neodinštaluj ju. Over zachovanie starších návštev po reštarte.
13. Hľadaj `kosice zoo`, `ZOO Košice` a `ZOO`. Zobrazí sa najviac päť výsledkov s lokalitou. Mapa sa presunie až po výbere. Ak miesto chýba, uprav dopyt a znovu hľadaj. Vybraný názov, lokalita a súradnice sa prenesú do formulára.
14. Počas pomalého hľadania zmeň text: staré výsledky sa nesmú objaviť. Over prázdny výsledok, chybu internetu, opakované hľadanie a zavretie ponuky. Zoznam výsledkov sa dá posúvať aj na malom displeji.

GeoNames vyžaduje aktívny `EXPO_PUBLIC_GEONAMES_USERNAME` v EAS preview. Podrobnosti a obmedzenia hraníc sú v COUNTRY_DATA.md.
Úprava nemení testovacie prihlasovanie na skutočné účty a nepridáva cloudové zálohovanie.

Hľadanie používa verejné Photon API nad OpenStreetMap: https://github.com/komoot/photon . Dopyt sa posiela až po stlačení Hľadať. Poradie určuje služba podľa zhody, významnosti a blízkosti stredu mapy; nejde o popularitu Google vyhľadávania. Kategórie zoo, múzeum a nemocnica sa oddelia od názvu/lokality, ostatné dopyty využívajú voľné textové vyhľadávanie služby vrátane tolerancie preklepov. Pokrytie bodov sa môže líšiť od Google mapy. Verejná služba nemá garanciu dostupnosti; pred veľkým verejným nasadením treba dohodnúť kapacitu alebo vlastné hostovanie. GeoNames zostáva pre dohľadanie lokality pri ručnom výbere bodu.
