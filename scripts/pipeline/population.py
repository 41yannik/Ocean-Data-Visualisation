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
    from pipeline.io_load import load_emdat, load_ibtracs, load_wpp
    from pipeline.join import match_events
    from pipeline.intensity import apply_intensity
    from pipeline.normalize import normalize_name

    em, ib, wpp = load_emdat(), load_ibtracs(), load_wpp()
    ev = join_population(apply_intensity(match_events(em, ib), ib), wpp)

    n_pop = ev["pop"].notna().sum()
    n_ext = ev["pop_extrapolated"].sum()
    print(f"Bevölkerung: {n_pop}/99 Zeilen mit pop · {n_ext} davon extrapoliert (>2023)")

    names = ev["event_name"].map(normalize_name)
    maila = ev[names == "MAILA"]
    print(maila[["disno", "iso3", "year", "intensity_kt", "total_affected", "pop", "pop_extrapolated", "affected_pc"]].to_string(index=False))
    assert len(maila) >= 2 and maila["affected_pc"].notna().all(), "Maila ohne Pro-Kopf-Wert!"
    assert maila["pop_extrapolated"].all()

    over = ev[ev["affected_pc"] > 1]
    assert over.empty, f"affected > population bei: {over['disno'].tolist()}"
    top = ev.nlargest(5, "affected_pc")[["event_name", "iso3", "year", "affected_pc"]]
    print("Top-5 pro Kopf:\n" + top.to_string(index=False))
    print("population: alle Smoke-Checks OK")
