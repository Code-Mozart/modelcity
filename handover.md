# Handover: Bressel map editor, design preparation

## 1. What this is
The user is designing a browser-based vector map editor (working name "modelcity") to build "Bressel", a fictional, dense, self-contained German city map for a video game (4 x 4 km). This work is the brainstorming and design preparation for the editor's MVP, not the implementation. The focus so far: how roads, lanes, junctions and curves are edited and represented. Everything about the underlying data model (nodes, edges, derived geometry) is being re-opened; what follows is only what still holds.

**Method that worked.** Think out loud, propose a concrete default with short UX reasoning instead of only asking, argue honestly (the user wants disagreement, not agreement), define terms before using them, and refer to examples precisely (names or numbers, not "left/above"). The user draws hand-made mocks on a tablet and shares screenshots; images arrive with file names. The user likes quick single-file HTML canvas demos to feel how an interaction behaves; **test the math numerically before building them** (that caught real bugs). Keep replies short and lead with the answer. The user writes English; German domain words are normal.

## 2. The latest demo (the user will paste its code and screenshots; it is the only curve work that survives)
A "through-node curves" demo: nodes lie **on** the curve and each carries a heading (arrow). Between two nodes an edge takes one of these shapes:
- **One bend:** straight, arc, straight. The arc's circle is tangent to both heading lines; the blue control point is where the two heading lines meet.
- **S-curve:** straight, arc, straight through the inflection point, arc, straight. Both arcs share **one** radius. The middle line is where the two arcs touch at the largest radius; a smaller radius rounds the two corners of that polygon and leaves straight stubs.
- **Hook** (same-direction two-arc edge, up to about 285 degrees of turning): provisional and not designed.
- **Radius:** one per edge, auto (the largest that fits) or explicit. **Changing the radius never changes the headings.** Gesture for a one-bend edge: the circle tangent to both heading lines through the cursor, grabbed at the arc's midpoint; double-click resets to auto.
- **Handles:** node (position), arrow tip (heading), blue point (drag sets both headings), orange ring (radius), turquoise points (S: display only).
- **Insert a node on a curve:** the new node takes the tangent as its heading and both halves keep the radius, so the curve does not change.
- **Lessons learned:** positions + headings + radius do **not** fully determine the curve (the same data can be a one-bend edge or an S, and a hook has a rotation direction), so each edge needs a stored shape tag (bend, S or hook, plus the first turn direction); the tag is chosen automatically at creation and cleared when a heading is edited. A single arc cannot exceed 180 degrees in the one-bend form. Tight bends where an inner lane would need a negative radius are unsolved (idea: a kink node).
- **Why it was attractive:** junction turns become one edge between two connection nodes, lane shifts and tapers become S-curves, and the corner-radius and capacity machinery shrinks. Not yet verified against: a junction turn as one edge, a lane split and merge, and parallel lanes through a bend with different radii.

## 3. Design decisions that still hold (independent of the data model)
**Traffic and lanes**
- Right-hand traffic everywhere. Every lane is one-way; a two-way road is lanes with opposite directions.
- No traffic simulation or AI. Connections, priority and markings are visual and exportable data; a solid line is not enforced.
- A lane added on the right of an existing lane has the same direction, on the left the opposite direction. Lanes are added at the carriageway edge; inserting a lane between two lanes is not supported (a left-turn pocket emerges from lane math). Exception: at a crossing with a center island the two opposing lanes move apart symmetrically.
- Property override order: instance > cross-section preset > class defaults, per lane. A preset library (built-in and user-saved) is wanted; its design and name are open.
- Generate rather than store: tapers, gores, connections, lane assignment, arrows and markings are derived; hand edits are stored as exceptions on top. Prefer clever generation over repeated manual work.
- Defaults (unverified, keep in one editable table): lane width car 3.0 m, bus 3.25, tram 2.9, bike and foot 1.5; new bends use 1.5 x the class minimum radius (footpath minimum 1.5 m, default 2 m); a lane split leaves at most 45 degrees.

**Lane math (decided): matching turn movements to lanes.** Left to right as the driver sees it; a movement goes to the lane nearest its side.
1. A lane is left-only if possible, not left plus straight.
2. With more movements than lanes, split the lanes 50/50 between left and straight+right.
3. Right gets its own lane only when all left and straight lanes are served.
4. Usually only the rightmost lane goes right; the others are straight-only.
Examples: 1 lane: shared. 2 lanes with left+straight: left | straight. 3 lanes with left+straight: left | straight | straight. 2 lanes with all three: left | straight+right. 3 lanes with all three: left | straight | right. Users can override connections.

**Junctions**
- Fork vs T: the through pair is the pair of arms with the least deflection; a side arm leaving at less than 60 degrees is a fork (with gore rules), otherwise a T.
- Left turns yield to opposing through traffic (drawn as a yield line across the left-turn lane at the junction mouth).
- Kerbs follow the inner turn lane by its offset; the two corners of a junction can have different radii. Conflict points are generated where turning paths cross. Priority is a property of each connection.
- Junctions are created by clicking a road and dragging the branch; a finished junction keeps the tool active.

**Merges, splits, gore**
- Ramp length is the number of ramp-lane segments before the merge (0, 1 or 2 in the reference cases). Dropping a lane means the lane ends by merging into its neighbor. A taper (pavement wedge) joins only same-direction lanes; the gore is the hatched area between diverging lanes up to the nose where the facing boundaries touch.
- Default priority at a merge: the ending lane yields. Warnings: merge segment shorter than its taper; ramp too short for its approach; a direct merge on Autobahn or primary roads.

**Markings (generated)**
- Opposing divider: dashed with exactly 2 lanes, solid with 3 or more, dashed where turning paths must cross it (inside a junction), solid in tight bends.
- Same-direction boundary: dashed; solid beside a turn pocket so it is not crossed, with a dashed entry zone at the pocket start.
- At a lane split the divider fans out from the centerline parallel to the widening edge. Arrows come from the lane assignment. A line is dashed where changes must be possible and solid where they must not. Rules live in one table so they are easy to change.

**Crossings:** a foot/bike path crossing a road shares the crossing with the lanes; stripes and signs are generated from it; with a center island there is no island lane, the gap between the opposing lanes is derived (hatched toward the tapers, raised island parts flanking the cut-through).

**Waterways (independent of roads):** rivers and streams are smooth cubic Bezier arms with automatic handles (handle length = chord / (3 cos^2(phi/4))) and a width stored per vertex. Arms meeting at a junction share one tangent, the average of all inflow-to-outflow through-directions (no main or side arm in the geometry). Flow direction is stored per arm and editable per chain (the path between two leaf vertices); junctions with all arms in or all out are flagged. Stream hierarchy is metadata only, never driving geometry.

**Editing conventions that worked**
- Creating: click, move, click; the cursor label shows length and angle and can be typed into; angle snap 15 degrees relative to the previous segment (180 degrees snaps explicitly); clicks closer than 0.5 m are ignored; one road is one undo step.
- Keys: first right click detaches and keeps the tool, second exits; Esc finishes and exits; Backspace removes the last point while drawing. Ctrl (Cmd on Mac) turns all automatic help off; Alt fills a new lane to the next structure (Alt+Shift: the whole stretch); Shift adds to the selection. One central keymap so keys are easy to change.
- Snapping: guides appear as dashed blue lines or circles (axis, perpendicular, parallel, mirror, equal length, the extended edge of an adjacent road offset by the new road's width, intersections of guides); snap radius 12 px; guides only within 150 px; at most 6 shown.
- Color legend: gray committed, green being created, magenta being modified, blue selection and guides, red invalid. Zoomed-out lanes collapse below 3 px per lane while direction chevrons stay.

## 4. Mocks wanted (none done yet; reset to zero)
Situations to clarify, through mocks or discussion, roughly in priority order:
1. Creating a road, including the cross-section ghost and one-way vs two-way start.
2. Bends with several parallel lanes: concentric radii, inner lanes that run out of radius, S-shaped lane shifts.
3. A junction turn drawn as a single curve between two points; T, four-way, fork, five or more arms, a junction on a bend, kerbs.
4. Lane split, lane merge, drop lane, extending lanes, with tapers, gore and ramp length.
5. Customizing which lanes connect at a junction, and priority/yield.
6. Changing direction of a lane.
7. Lane types, width transitions, the cross-section preset library.
8. A path crossing a road, with and without a center island.
9. Roundabouts of different sizes and designs; ramps and loops (hooks).
10. Ending a road on another road; signs, priority roads, traffic signals.
11. Selection of overlapping or stacked items; creating a corner with one click.
12. Not yet considered at all: rail and tram specifics, bridges and tunnels, vertical profiles and terrain, waterway editing in practice, export formats.

## 5. Bressel checklist (verbatim, from the user)
### Bressel checklist

Checklist for a made-up medium-sized German city and surrounding towns, fields, infrastructure and nature as a video game setting. In general the square map should be dense rather than large, so it feels larger than it really is (like GTA V or Modellbau, think Legoland). Also in general most things should be unique or if there are multiple there should be 2, typically one larger, one smaller, e.g. the cities themselves. The map should be self-contained (a bit like in Truman show) and the networks should feel plausible and sensible. It should capture an average cross-section of German cities and culture. It should not be frozen at a certain season and weather. It should be more representative than realistic, featuring everything rather than a realistic subset of German flavor.

#### ROAD NETWORK
- closed hierarchical network of roads
- no outside connections
- one large and long main Autobahn
- multiple highway exits
- at least one Autobahn that coverts to a regular large road
- at least one big highway intersection
- one large Autobahn bridge
- one longer Autobahn tunnel
- a closed network of large roads (collector roads) and stroads with various density (i.e. dense in some areas and sparse in others)
- many small access streets, regular streets and one-way streets that form the street layout for the city and surrounding area
- multiple roundabouts with different sizes and designs
- multiple different-sized intersections with traffic lights
- intersections with "rechts vor links"
- "Feldwege" between fields
- Bike paths and dedicated "Fahrradstraßen"
- Many road bridges across the smaller rivers but only 3 across the main river in Bressel (where the river is quite wide)
- "Schleusse" with road across acting as water power plant
- "Verkehrsberuhigte Straßen" with "Schikanen" and "Zebrastreifen"

#### RAIL NETWORK
- a central station with 5 platforms in Bressel
- the second city central should have two train stations, the main station having 3 platforms
- railyard with a transfer table to move vehicles between tracks
- a handful of smaller stations
- bridges and tunnels
- at least one railroad-crossing with gates

#### Tram
- Tram network only in Bressel with a tram depot somewhere more along the outer city districts
- 2 longer lines and one shorter line
- Tram platforms along the lines, some older ones and some and more recent ones with more safety features and level-boarding
- 1 or 2 bridges with tram
- some tram segments with grass tracks
- most of the tram should run on dedicated lanes, often in the center of the road

#### POINTS OF INTEREST
- a "Fußgängerzone", i.e. main pedestrian shopping street in the city center
- large main church or cathedral or dome
- an (ugly) "Parkhaus" in the city center
- university near city center
- zoo
- museum
- "Rathaus" with a modern style and a clock tower
- market square with "Wochenmarkt" in the old town
- Old town with "Fachwerkhäusern"
- public library
- central train station
- main bus station
- medium-sized airport with a single runway, adjacent hotels and parking, the flight paths should be plausible and not blocked off, the airport should be near the city or adjacent but not at the center
- helicopter pads for police at the airport
- bus depot
- prison
- police hq
- fire department hq
- hospital with helicopter pad
- ambulance garage and hq
- wastewater treatment facility
- "Recyclinghöfe"
- coal power plant along the canal part of the main river
- power distribution station
- "Müllverbrennungsanlage"
- a large construction site
- separate shopping mall with large outside parking spaces
- a shopping mall in the inner city
- medium-sized main "Fußballstadion" with many parking spaces outside the city
- sport park with multiple football fields
- public pool ("Freibad")
- 2 night club
- plaza for festivals / "Volksfest" and "Weihnachtsmarkt"
- old castle
- large cemetery
- one or multiple area(s) with "Schrebergärten"
- beach for bathing in the ocean
- 1 "Autobahnraststätte" with motel and 1 "Rastplatz"
- Wind turbine park on the center hill
- "Landstraße" bridge over a wooded valley with a stream at the middle
- a large quary in the hills
- harbor with cranes, docks, warehouses, outside container storages
- "Kleintierzucht" house, likely rather in one of the towns
- "Schützenhaus" which is located similarly
- 2 "Campingplätze", each one unique in some way

#### Other buildings
- multiple smaller church buildings spread throughout the city
- mosques
- Medical clinics ("Artztpraxen")
- smaller emergency response buildings for police and F.D. ("Freiwillige Feuerwehr")
- schools ("Grundschulen", "Gesamtschulen" and "Gymnasien" and "Berufsschulen")
- "Kindergärten" and "Kitas"
- stores and supermarkets and discounters
- banks
- restaurants
- dance schools
- "Sporthallen" often in proximity to schools
- "Autowerkstätten/händler" and "Autohäuser"
- bike shops
- gas stations and "Autowaschanlagen"
- "Baumarkt" (e.g. Obi) and "Möbelhaus"(e.g. IKEA)
- all of these are in part of a "Gewerbegebiet"
- hotels and "Jugendherbergen"
- factories and workshops
- warehouses
- offices and office parks
- post offices
- parking
- ~10-story housing buildings
- Townhouses and row houses ("Mehrfamilenhäuser")
- single family homes and villas
- parks
- a lake somewhere outside the main city with a boat rental (recreational)
- "Biergärten" and pubs
- "Bauernhöfe" with "Hofladen"

#### CITY & MAP LAYOUT
- the map is hilly on one side with another larger complete hill somewhere near the center of the map
- another side should have ocean
- one side may have fields (but still no outside connections!)
- the remaining of the 4 sides might transition between hills, forest and fields
- by hills i mean "Mittelgebirge", i.e. 50 to 300 meters or so
- prefer natural hidden walls using elevation, rivers, forests, etc, but never blocked-off roads
- there is one wide main river originating from multiple smaller rivers and smaller streams still and ending in the ocean
- it should be entirely self-contained and traverse through multiple cities, possibly by having a curved or S shape overall
- in or possible a bit before Bressel it splits into a recreational river part and an industrial canal and rejoins somewhere in Bressel further downstream
- the map should feature multiple smaller forests with streams, wooden bridges and "Wanderwegen", "Hochsitzen"
- the forests may cover the hillsides
- main city named "Bressel" which lies along the main river and a bay
- second largest city, roughly half the size, also along the river
- 4 smaller towns which should all have unique placements
- Fields for agricultural industry
- Some vineyards across the map on the hillsides

#### OPEN QUESTIONS
- is there anything else obvious or typically German missing?
