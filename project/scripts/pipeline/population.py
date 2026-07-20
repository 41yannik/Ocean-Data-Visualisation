"""Bevölkerungs-Join (WPP, ISO3+Jahr) mit Forward-Fill über 2023 hinaus; Betroffene pro Kopf."""
import pandas as pd

from pipeline.reference import WPP_LAST_YEAR


def join_population(events: pd.DataFrame, wpp: pd.DataFrame) -> pd.DataFrame:
    """Hängt pop, pop_extrapolated, affected_pc an. Jahre > WPP-Ende nutzen den letzten WPP-Wert."""
    pop_lookup = {(r.iso3, r.year): r.population for r in wpp.itertuples(index=False)}
    last = wpp.sort_values("year").groupby("iso3")["population"].last().to_dict()

    pops, extrapolated = [], []
    for r in events.itertuples(index=False):
        key = (r.iso3, min(r.year, WPP_LAST_YEAR))
        p = pop_lookup.get(key)
        if p is None:
            p = last.get(r.iso3)
        pops.append(p)
        extrapolated.append(bool(r.year > WPP_LAST_YEAR and p is not None))

    out = events.copy()
    out["pop"] = pd.to_numeric(pd.Series(pops, index=out.index), errors="coerce")
    out["pop_extrapolated"] = extrapolated
    out["affected_pc"] = out["total_affected"] / out["pop"]
    return out


if __name__ == "__main__":
    from pipeline.challenge import build_challenge_events
    from pipeline.io_load import load_ibtracs, load_pdh_affected, load_wpp

    ev = join_population(build_challenge_events(load_ibtracs(), load_pdh_affected()), load_wpp())

    n_pop = ev["pop"].notna().sum()
    n_ext = ev["pop_extrapolated"].sum()
    print(f"Bevölkerung: {n_pop}/{len(ev)} Zeilen mit pop · {n_ext} davon extrapoliert (>2023)")
    assert n_pop == len(ev), "Land-Jahr ohne Bevölkerungswert!"

    # Jahresmeldungen zählen Personen je Katastrophe: in Mehrfach-Katastrophen-Jahren
    # kann der Jahresanteil über 1 liegen (z. B. MHL 2020). Plausibilitätsgrenze 3.
    over = ev[ev["affected_pc"] > 1]
    print(f"Jahresanteil > 100 %: {[(r.iso3, r.year, round(r.affected_pc, 2)) for r in over.itertuples()]}")
    assert (ev["affected_pc"] < 3).all(), "unplausibler Jahresanteil (>= 300 % der Bevölkerung)!"
    top = ev.nlargest(5, "affected_pc")[["event_name", "iso3", "year", "affected_pc"]]
    print("Top-5 pro Kopf:\n" + top.to_string(index=False))
    print("population: alle Smoke-Checks OK")
