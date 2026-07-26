# Problem statement (Pacific Dataviz Challenge 2026, registration form)

**Entry:** From Track to Toll (interactive dataviz)
**URL:** https://ozeanvisualisierung.yannik-h-huber.de
**Theme:** Climate change

## The problem addressed

Reporting on Pacific tropical cyclones almost always equates storm strength with human
consequence: Category 5, record wind, therefore record disaster. That equation drives where
attention and preparedness money go. It has never been easy to check against open data,
because the hazard record and the impact record live in separate places: cyclone tracks in
IBTrACS, reported human impact in the Pacific Data Hub's SDG 11.5.1 series. Between them sits
a third problem that is rarely shown at all, the reporting gap: 75 of 174 reported
country-years in the Pacific record exactly zero people affected, 51 of those despite a
cyclone passing within 500 km, and a further 130 storm-exposed country-years carry no entry
at all.

## How the dataviz responds

"From Track to Toll" puts the two records on the same page and tests the equation. Nine guided
steps take the reader from the warming ocean to a single scatterplot in which each dot is one
country in one year, placed by the wind that the cyclone actually brought to that country and
by the share of its population reported affected. Across the 70 complete records the wind
explains 1.5% of the differences, and that relationship is not statistically detectable
(p = 0.306). The country's population size explains 12.7% (p = 0.003) on the same records.
The visualisation therefore argues a negative finding and stays useful: it names what the wind
does not explain, offers the one structure the data does support, and shows the reported zeros
and the missing rows as their own visual categories instead of filtering them away. A final
Evidence Lab lets readers re-run the same comparison across the underlying country-year table
with shared filters, selection and four linked perspectives. Every number in the text is
resolved at runtime from the published data artefacts, and a "Data & methods" section documents
each source, licence, transformation and its limits.
