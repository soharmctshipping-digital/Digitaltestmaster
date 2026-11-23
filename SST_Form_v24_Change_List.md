# Form v24: full change list

Agreed with the owner on 23 November 2026. Not built yet. The live form stays v23
(`1400138701949428`) until v24 is built, previewed and approved.

## Why a new version is needed

A WhatsApp form (Flow) cannot be changed once it is published in Meta. Every change below
therefore means a new form, v24, built as a draft, previewed, then published, with SST 1
switched to it. v23 stays published as the fallback. The bot-side changes (how SST 1 reads the
answers) are made in SST 1 itself and need no new form.

## A. Fix: answers from a previous service carried into a new one (owner's point 2)

Problem: a customer who starts one service, goes back and picks another still has the first
service's answers kept by the form, and they travel with the new submission.

Cause: v23 uses one shared set of pages (BASICS, DETAILS, FINAL) for every service. WhatsApp
keeps what was typed on a page when the customer goes back, and the "Send" button collects the
answers from all three pages regardless of which service is now chosen.

Fix in v24:
1. Each service gets its own pages (for example SEA_1, SEA_2, SEA_3; AIR_1, AIR_2; ...). After a
   change of service the customer lands on that service's own pages, which start empty.
2. Each service's last page sends only that service's answers.
3. Belt and braces in SST 1 "Read message": keep only the answers that belong to the service
   selected on the first page and drop anything else.
4. Side benefit: no page is shared by nine services any more, so the 100-component limit per
   page stops being a constraint (DETAILS is at 97 of 100 today).
5. To check while building: Meta's limits on the number of pages and the size of the form; the
   build check in T8 will be extended to cover them.

## B. Air freight: Muscat Airport fixed (owner's points 3 and 4)

6. Import into Oman by air: destination airport is Muscat Airport, shown as a line of text
   ("Arriving at: Muscat Airport"), not asked. Only the airport of origin is asked.
7. Export from Oman by air: airport of origin is Muscat Airport, shown as text, not asked. Only
   the destination airport is asked.
8. SST 1 "Read message" writes the fixed airport into the enquiry.

## C. New questions (all gaps from the charge-point review except HS codes, which wait)

Import customs clearance
9.  Container size (20ft / 40ft / both), shown when "What is being cleared" is full container or
    reefer container. Required.
10. When arriving by road: "How many trucks?" in place of "How many?". Required.
11. Cargo value (USD), optional, for a duty estimate.

Transit through Oman
12. Cargo value: changed from optional to required (it sets the bank guarantee).
13. "Where does the empty container go back to?" (Stays at destination / Back to Sohar Port /
    Jebel Ali / Duqm Port / Not sure), shown when containers are moving. Required.
14. "Electric or hybrid?" (No / Electric / Hybrid / A mix), shown when vehicles are moving.
    Required.
15. "Is there a consignee at destination who will clear the goods?" (Yes / No / Not sure).
    Required.

Sea freight RoRo
16. "Electric or hybrid?" (No / Electric / Hybrid / A mix). Required.

Sea freight break bulk / bulk
17. Total volume (CBM), "not sure" accepted. Required.

Sea freight FCL
18. "Do you need extra free days at the destination port?" (No / Yes) and, if yes, "How many
    days?". Optional.

Project and heavy-lift cargo
19. Total volume (CBM), "not sure" accepted. Required.
20. "How will it be shipped?" (Break bulk / Flat rack or open top / Not sure). Required.
21. "Crane or offloading help at site?" (Yes / No / Not sure). Required.

Air freight
22. "Is this for an exhibition or a temporary import?" (No / Yes), import only. Required.

Warehousing and 3PL
23. "Arriving as" (Pallets / Loose cartons / A mix). Required.
24. "Delivery areas", shown when local delivery is ticked (if WhatsApp's form rules cannot show
    a field based on a tick box, it becomes an optional field labelled "Delivery areas, if you
    need local delivery").

Shipping agency
25. "Vessel type and size (GRT or LOA)". Optional.
26. "Expected days in port". Required.
27. "How many crew joining and leaving?", shown when crew change is ticked (same tick-box
    caveat as item 24).

Left out on purpose
28. Number of HS codes: parked by the owner.

## D. SST 1 (the bot) changes that go with v24

29. "Read message" reads every new answer into the enquiry text, with plain labels (no codes).
30. "Read message" keeps only the selected service's answers (item 3).
31. "Build Claude request": point FORM.service at the v24 id.
32. Prompt: these facts now come from the form, so the bot must not ask for them again in chat.
33. Keep reading v23 answers too, so a customer with a v23 form already open can still send it.

## E. Build and test steps

34. Build v24 in T8 "Form definition" with a new name (Meta refuses a repeated name).
35. Extend the T8 build check: page count, total size, no empty page for any path, no
    answer from another service in any page's "Send" payload.
36. Create the draft in Meta, send the preview link to the owner.
37. Owner checks in the preview, including: start sea freight, go back, switch to air freight,
    and confirm nothing from sea freight appears or is sent.
38. On the owner's word: publish v24, switch SST 1, publish SST 1.
39. Live tests with dummy numbers for every service, then one enquiry from the owner's phone.
40. Log everything in `SST_BOT_CHANGE_LOG.md`.
