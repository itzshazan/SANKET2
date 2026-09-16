SANKET — Detailed MVP Feature Specification
1. NER Regional Dashboard
Purpose
Give disaster-management authorities an immediate overview of the entire North Eastern Region.
What the user sees
- Map of all 8 NER states
  - Arunachal Pradesh
  - Assam
  - Manipur
  - Meghalaya
  - Mizoram
  - Nagaland
  - Sikkim
  - Tripura
- Total monitored districts
- Number of high-risk zones
- Active warnings
- Affected villages
- At-risk roads
- Critical infrastructure at risk
- Current rainfall summary
- Overall regional risk status
Interactive elements
- Click a state
- Filter by risk level
- Select a district
- Open the detailed GIS map
- View active warnings
Example
NER STATUS
Danger: 04 | Warning: 17 | Watch: 32 | Normal: 112
Highest Risk: ManipurMost Affected: Noney DistrictConnectivity Alerts: 7
2. NER GIS Risk Map
Purpose
The central feature of SANKET — visually identify where risk exists and what lies inside the risk zone.
Map layers
Risk
- Normal
- Watch
- Warning
- Danger
Geographical
- State boundaries
- District boundaries
- Villages
- Roads
- Rivers/drainage
- Terrain
Environmental
- Vegetation / NDVI
- Rainfall
- Soil moisture
Disaster
- Historical landslides
- Reported landslides
- Reported cracks
- Road blockages
Infrastructure
- Bridges
- Hospitals
- Schools
- Other critical infrastructure
User interaction
User can:
NER → Manipur → Noney → Risk Zone
Clicking a zone opens:
Location: NoneyRisk: WARNINGRainfall: HighSoil Moisture: ElevatedTerrain: SteepVegetation: ReducedAffected Villages: 3Roads at Risk: 2
Strong USP
Instead of only showing:
"Landslide risk here."
SANKET shows:
"This risk zone may affect these specific villages, roads and infrastructure."
3. District Risk Monitoring
Purpose
Allow an authority to move from regional overview → specific district → specific location.
User selects
State → District
Example:
Manipur → Noney
District page contains
- Current risk level
- Risk-zone map
- Rainfall graph
- Soil-moisture graph
- Vegetation condition
- Terrain information
- Historical landslide count
- Active field reports
- At-risk villages
- At-risk roads
- Active alerts
Risk summary
Example:
WARNINGHeavy rainfall + elevated soil moisture + steep terrain are contributing to increased risk.
For the MVP, these values can be preloaded/hardcoded.
4. Environmental Monitoring
Purpose
Show the environmental conditions that influence landslide risk.
Rainfall
Show:
- Current rainfall
- 24-hour rainfall
- 72-hour rainfall
- 7-day accumulation
- Historical rainfall
- Rainfall trend
Soil moisture
Show:
- Current moisture condition
- Recent trend
- Normal/elevated condition
Vegetation
Show:
- NDVI
- Vegetation density
- Vegetation change
- Areas with reduced vegetation
Terrain
Show:
- Slope
- Elevation
- Drainage
- Land cover
- Geological information
User experience
The user doesn't need to understand raw satellite data.
Instead:
Rainfall: HIGHSoil Moisture: ELEVATEDVegetation: MODERATESlope: STEEP
This makes it understandable to a district officer.
5. AI Risk Assessment Interface
Even though the actual ML model isn't part of the MVP, the interface should demonstrate how the final SANKET system will work.
User sees
Risk Assessment
Factor
Status
Terrain Susceptibility
High
Rainfall Trigger
High
Soil Moisture
Elevated
Vegetation
Reduced
Historical Vulnerability
High
↓
Final Output
WARNING
Increased landslide risk detected.
Important
For the MVP, this can use predefined risk values and rules.
Don't claim:
"Our trained AI predicted this."
Instead demonstrate:
"This interface represents the final AI-driven risk assessment module."
6. Landslide & Change Detection
This combines your CV-related user experience without requiring the CV model itself in the MVP.
Satellite Detection
Display:
- Historical satellite image
- Recent satellite image
- Detected/marked landslide scar
- Location
- Approximate affected area
Field Evidence
Show:
- Uploaded photograph
- Location
- Report type
- Date/time
- Status
Report categories:
- Crack
- Slope movement
- Landslide
- Debris
- Road blockage
MVP implementation
You can use pre-labelled/sample images and hardcoded detection results.
Later:
Satellite image → CV model → landslide scar
and
Field image → CV model → crack/debris/blockage
7. At-Risk Area & Connectivity Analysis
This should be one of SANKET's strongest NER-specific features.
Why?
In the North East, a landslide can do more than damage a slope.
It can:
Block a road → isolate a village → delay emergency response.
User selects a risk zone
SANKET displays:
Affected Villages
- Village A
- Village B
- Village C
Roads at Risk
- Road A
- Road B
Critical Infrastructure
- Health centre
- School
- Bridge
Connectivity status
Use:
OPENAT RISKBLOCKED
Example
Potential Isolation
3 villages depend on the affected road connection.
That is a very strong NER-oriented USP.
8. Field Reporting
Purpose
Bring ground-level information into the system.
Field officer workflow
Open Field View
↓
Select Location
↓
Choose Report Type
- Crack
- Slope movement
- Landslide
- Debris
- Road blockage
↓
Upload Photo/Video
↓
Add Description
↓
GPS Location
↓
Submit
Report card
Show:
Report #024
Location: Noney, ManipurType: Road BlockagePhoto: AttachedGPS: CapturedStatus: Submitted
Offline functionality
If there is no network:
Save locally → Pending Sync
When connectivity returns:
Automatic Sync → Dashboard
This directly addresses remote NER conditions.
9. Early-Warning & Alert System
Purpose
Convert risk information into an actionable warning.
User workflow
Select District / Zone
↓
Select Severity
Watch / Warning / Danger
↓
Select Audience
- District authority
- Disaster management team
- Field teams
- Community
↓
Select Language
↓
Generate Alert
Alert example
WARNING — Noney, Manipur
Increased landslide risk in identified vulnerable zones.
Authorities are advised to monitor affected roads and vulnerable slopes.
Alert dashboard
Show:
- Active alerts
- Alert severity
- Location
- Time issued
- Recipients
- Status
For the MVP, alert generation and preview are sufficient. Actual SMS infrastructure can come later.
10. Response Prioritisation
Purpose
Answer:
"Where should authorities act first?"
Priority calculation for MVP
Use predefined/hardcoded values based on:
Risk + Population + Road Importance + Infrastructure + Isolation
Example
PRIORITY 1
Noney Zone ADanger3 villages1 critical road1 health facility
PRIORITY 2
Noney Zone BWarning2 villages1 road
PRIORITY 3
Zone CWatchLow exposure
User interaction
Click:
Priority 1 → View on GIS Map
This connects the analytics directly to action.
11. Historical Backtesting
This is one of the best features to demonstrate in the SIH presentation.
User workflow
Select Historical Event
Example:
Noney Landslide — 2022
↓
Select:
30 days before event
↓
Display:
- Rainfall
- Soil moisture
- Environmental conditions
- Risk progression
Timeline
30 Days Before
↓
NORMAL
↓
WATCH
↓
WARNING
↓
DANGER
↓
ACTUAL LANDSLIDE
Main result
Warning Lead Time
Example:
SANKET reached WARNING X hours before the recorded event.
The actual number should only be shown once you have genuinely calculated it from your chosen historical data.
Why this matters
You're not just saying:
"Our system predicts landslides."
You're demonstrating:
"Here is how the system can be evaluated against a real NER landslide event."
12. Risk Explanation
This should appear whenever a user clicks a risk zone.
Example
WHY IS THIS AREA AT RISK?
- Steep terrain
- High recent rainfall
- Elevated soil moisture
- Reduced vegetation
- Historical landslide activity
Visual format
Use simple indicators:
Rainfall █████ HIGHSoil Moisture ████ ELEVATEDSlope █████ HIGHVegetation ██ LOW
This makes the system explainable and user-friendly rather than giving an unexplained risk number.
13. Multilingual Interface / Alerts
MVP
Provide language selection:
English | Hindi | Selected NER languages
For safety-critical text, use pre-approved translations, not machine-generated free-form translations.
Example
User selects:
Manipur → Language → Manipuri
Alert is displayed in the corresponding prepared language.
For languages where verified translations aren't available yet, don't fake coverage—label them as planned/under development.
14. User Roles
Keep this simple for the MVP.
District Officer
Can:
- View regional/district risk
- Analyse affected areas
- Prioritise response
- Generate alerts
- View reports
Field Officer
Can:
- View assigned risk areas
- Submit reports
- Upload photographs
- Work offline
- View alerts
Community/User
Can potentially:
- View relevant warnings
- Receive alerts
- Submit reports
For the first prototype, District Officer + Field Officer are enough.
15. Main Website Navigation
I'd keep the actual website navigation very simple:
SANKET
│
├── Dashboard
├── GIS Risk Map
├── Risk Monitoring
├── Field Reports
├── Alerts
├── Response Priorities
└── Historical Backtesting
And inside the GIS Risk Map:
Risk
Terrain
Rainfall
Soil Moisture
Vegetation
Landslides
Roads
Villages
Infrastructure
Field Reports
Complete MVP User Journey
The strongest demo sequence would be:
LOGIN
↓
Select Manipur → Noney
↓
Dashboard shows WARNING
↓
Open GIS Risk Map
↓
Click high-risk zone
↓
SANKET explains WHY
↓
Shows 3 villages + 2 roads at risk
↓
Officer opens Response Priorities
↓
Zone becomes Priority 1
↓
Officer generates Warning Alert
↓
Field Officer opens mobile view
↓
Uploads geo-tagged road-blockage photo
↓
Report appears on map
↓
Officer sees updated ground evidence
↓
Open Historical Backtesting
↓
Replay Noney event
↓
Show risk escalation + calculated lead time
--- TABLE ---
Factor | Status
Terrain Susceptibility | High
Rainfall Trigger | High
Soil Moisture | Elevated
Vegetation | Reduced
Historical Vulnerability | High