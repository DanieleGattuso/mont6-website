# Redirect permanente di mont6.it — 24 settembre 2026

Stato: **redirect attivo e verificato pubblicamente**. Ultimo controllo in sola lettura: **24 settembre 2026, 18:12:29 CEST / 16:12:29 UTC**. Zona Cloudflare `active`, delega pubblica corretta, certificato edge `active`, risposte 301 su HTTP/HTTPS per apex e www con percorso e query conservati.

## Obiettivo e registrazione

Reindirizzare `mont6.it` e `www.mont6.it`, sia HTTP sia HTTPS, verso `https://mont6cefalu.it`, conservando percorso e parametri della richiesta. Il dominio principale e il sito esistente restano `mont6cefalu.it`.

Il controllo WHOIS eseguito dall'operatore riporta stato `ok`, creazione `2026-09-24 17:49:47` e scadenza `2027-09-24`. Registrazione presso GoDaddy; gestione DNS attiva nella nuova zona Cloudflare Free, senza trasferimento del registrar.

## Configurazione Cloudflare

| Voce | Valore |
| --- | --- |
| Zona | `mont6.it` |
| Zone ID | `12f4cd001ea7147bf1e27637dd23b2bf` |
| Nameserver assegnati | `beth.ns.cloudflare.com`, `sean.ns.cloudflare.com` |
| A apex | `mont6.it` → `192.0.2.1`, proxied |
| A www | `www.mont6.it` → `192.0.2.1`, proxied |
| Universal SSL | Certificato `active`, Let's Encrypt; copre `mont6.it` e `*.mont6.it`; scadenza 23 dicembre 2026 alle 15:10:26 UTC |
| Ruleset Single Redirect | `5055bd1b4c2c4097869ee9b3586f9d4c` |
| Regola | Abilitata |

Condizione:

```text
(http.host in {"mont6.it" "www.mont6.it"})
```

Destinazione dinamica:

```text
concat("https://mont6cefalu.it", http.request.uri.path)
```

Codice HTTP: `301`. Conservazione query string: `true`.

Il record TXT `_dmarc` preesistente è conservato identico:

```text
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```

La zona GoDaddy originale non conteneva record MX: erano presenti il collegamento WebsiteBuilder dell'apex, `www`, `_domainconnect` e il DMARC predefinito. I collegamenti del WebsiteBuilder e Domain Connect non sono necessari al redirect Cloudflare. Non risultano servizi email configurati nella zona originale esaminata.

## Verifiche di attivazione

| Controllo | Esito |
| --- | --- |
| Salvataggio nameserver Cloudflare in GoDaddy | PASS: richiesta precedentemente accettata; cambio ora confermato dalla delega DNS pubblica |
| Delega pubblica NS e zona Cloudflare `active` | PASS: Google Public DNS restituisce `beth.ns.cloudflare.com` e `sean.ns.cloudflare.com`; API Cloudflare `active` |
| Assenza di DS DNSSEC incompatibili con la nuova delega | PASS: query pubblica DS, stato DNS 0 senza Answer; DNSSEC Cloudflare `disabled`, DS nullo |
| Risoluzione pubblica apex e www verso il proxy Cloudflare | PASS: entrambi risolvono su `188.114.97.7` e `188.114.96.7`, TTL 300 nella misura |
| Certificato edge attivo e valido per apex e www | PASS: API certificate pack `active`; richieste HTTPS reali riuscite con verifica TLS standard |
| HTTP apex → destinazione HTTPS, 301 | PASS: `http://mont6.it/` → `https://mont6cefalu.it/` |
| HTTPS apex → destinazione HTTPS, 301 | PASS: `https://mont6.it/` → `https://mont6cefalu.it/` |
| HTTP www → destinazione HTTPS, 301 | PASS: `http://www.mont6.it/` → `https://mont6cefalu.it/` |
| HTTPS www → destinazione HTTPS, 301 | PASS: `https://www.mont6.it/` → `https://mont6cefalu.it/` |
| `/en/?utm_source=redirect-check` conserva percorso e query | PASS: su entrambi gli alias HTTPS, Location `https://mont6cefalu.it/en/?utm_source=redirect-check` |
| Destinazione `/` e `/en/` risponde 200, nessun loop | PASS: entrambe le richieste HEAD HTTPS restituiscono 200 senza Location |
| Richieste crawler al dominio alias ricevono il redirect | PASS: dieci user-agent AI/Google simulati, GET HTTPS all'alias, tutti 301 con percorso e query conservati |

Esempio atteso: `https://www.mont6.it/en/?utm_source=redirect-check` → `https://mont6cefalu.it/en/?utm_source=redirect-check` con un redirect 301. Le eventuali normalizzazioni di altri percorsi sul sito di destinazione vanno distinte dal redirect del dominio alias.

### Metodo e limiti dell'ultima verifica

- API Cloudflare in sola lettura: zona, DNS, DNSSEC, certificate pack e ruleset. La regola è confermata abilitata, versione 1, ID `08c8b14cbfdc4493a3f4e081b346aaa0`; certificate pack `c954c5d7-1d28-4c3d-a74c-7bfea182e41a`.
- DNS pubblici interrogati via Google DNS-over-HTTPS alle 16:12:12 UTC. Le query DNS native nel sandbox sono andate in timeout; non sono state usate per dedurre un guasto del dominio. Il controllo DoH e le connessioni HTTP/HTTPS sono riusciti dalla rete abilitata.
- Matrice URL verificata con richieste HEAD senza seguire i redirect, confrontando lo status e l'header Location. Entrambe le home di destinazione rispondono 200 senza ulteriore Location.
- Prova GET del 24 settembre alle 16:12:29 UTC con `Googlebot`, `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `Google-Extended` e `Applebot-Extended`. Tutti ricevono 301 da `https://mont6.it/en/?utm_source=redirect-check` alla corrispondente URL sul dominio principale. Si tratta di user-agent simulati, non di scansioni effettive o prove di indicizzazione presso i servizi.
- Questa verifica conferma il funzionamento dal punto di osservazione usato; non certifica l'aggiornamento simultaneo di ogni cache DNS mondiale. Nessuna configurazione è stata modificata durante il controllo.

## Rollback

1. In GoDaddy ripristinare i nameserver originali `ns81.domaincontrol.com` e `ns82.domaincontrol.com`, dopo aver verificato che la precedente zona GoDaddy sia ancora disponibile.
2. Attendere la propagazione e verificare nuovamente delega e risposte pubbliche. Il ripristino dei nameserver riporta alla configurazione GoDaddy precedente, non crea un redirect alternativo.
3. Conservare temporaneamente zona e regola Cloudflare durante la propagazione. Disabilitare soltanto la regola, lasciando gli A al placeholder `192.0.2.1`, non costituisce un rollback funzionante.

## Riferimenti tecnici

La configurazione con A proxied `192.0.2.1` e redirect dinamico di percorso/query segue l'[esempio ufficiale Cloudflare per un dominio alias](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/). Non richiede un origin server dedicato.

Universal SSL abilitato non equivale a certificato già emesso: verificare lo stato del certificato e una connessione HTTPS reale, come indicato nella [documentazione Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/). La [procedura di cambio nameserver](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) richiede inoltre attenzione alla precedente delega DNSSEC.
