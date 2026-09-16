# Kontrola pridávania návštev na Android APK

Táto úprava rieši bezpečné odsadenie, spoločný formulár s mapou a radenie návštev.
Redizajn Home/Profil a cloudová synchronizácia zostávajú samostatnými úlohami.

## Overené pri príprave

- JavaScript/JSX syntax upravených súborov.
- Radenie podľa dátumu návštevy a následne createdAt zostupne.
- Zachovanie času vytvorenia a fotografií pri úprave a opätovnom načítaní.
- Staršie záznamy bez createdAt nedostávajú pri každom načítaní vymyslený nový čas.

## Overiť v novom APK

1. Home, Trips, Add Trip, Map a Profile: obsah neprekrýva stavový riadok ani výrez kamery.
2. Add Trip: vyber polohu na mape, následne ťukni na pomenované Google POI. Over názov a súradnice.
3. Map: otvor Pridať nový výlet aj bez predchádzajúceho výberu; polohu možno vybrať v otvorenom formulári.
4. Map: vyber miesto, potom pridaj návštevu. Formulár otvorí mapu pri vybranom bode.
5. Presuň značku a skontroluj nové súradnice. Rýchlo vyber dve miesta; oneskorená odpoveď pre prvé miesto nesmie nahradiť druhé.
6. Dohľadanie lokality používa GeoNames findNearbyPlaceNameJSON (najbližšia obec, nie overená adresa POI). Pri nedostupnej službe možno lokalitu doplniť ručne. Demo účet môže mať vyčerpanú kvótu; pre spoľahlivé dohľadanie nastav EXPO_PUBLIC_GEONAMES_USERNAME pre EAS preview.
7. Otvor klávesnicu, prejdi formulár a skontroluj dostupnosť Uložiť/Zrušiť nad systémovým ovládaním. Skús aj menší displej a otočenie telefónu.
8. Prázdne/neplatné súradnice a neplatný dátum sa nesmú uložiť. Dvojité stlačenie Uložiť nesmie vytvoriť dva záznamy.
9. Pridaj ZZZ a potom AAA s rovnakým dátumom návštevy. AAA má byť prvá pri Najnovšie; úprava ZZZ nesmie meniť pôvodný čas vytvorenia. Over aj po reštarte.
10. Značka uloženého výletu na Map otvorí detail; odtiaľ možno upravovať alebo mazať návštevu.

Úplná Android kompilácia ani vizuálna kontrola na telefóne neboli v pracovnom prostredí vykonané.
