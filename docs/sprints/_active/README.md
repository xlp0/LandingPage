# LandingPage active sprint area

Program GQC is active under sequential execution (`GQC-00` through `GQC-07`). Its primary outcome is a guided SPA test workflow in the Responsive UI Lab. Users select a target, choose a device and viewport, test functional links, record or replay a journey, and inspect its MCard result.

GQC runs LandingPage on Astro. Pages are static by default, and interactive regions hydrate as Preact islands that mount the existing modules. Astro is mounted inside the existing Express server. Every page is a Place, and every link, redirect, page switch, and UI-reachable server call is a Transition in a workbench net built on the `clm-kernel` Layer 1 `PetriNetTopology`. GQC-02A authors and checks that net. GQC-02B moves pages onto Astro.

PenPot-assisted MPA assessment or management remains an optional extension. The current PenPot graph describes LandingPage navigation. A separate, Product Manager-approved PenPot file is required to assess a target MPA. The staged scope is read-only assessment. Editing PenPot documents or managing live MPA routes needs a separate decision. The [active sprint index](./INDEX.md) records the shared Page-as-Place and Functional-Link-as-Transition contract. Review the [GQC execution plan](./gqc-plan.md) and its [ten sprint specifications](./INDEX.md#active-program-gqc).

The graduated [SMO architecture program](../01-architecture/INDEX.md) and [ERB testing program](../08-testing/INDEX.md) remain the source for the completed MCard browser, responsive lab, capture, replay, and device-conformance work. GQC reuses those contracts and does not rebuild them.
