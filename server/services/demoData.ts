// Demo data service for IndieShots application testing

export const demoUser = {
  id: "demo-user-123",
  email: "demo@indieshots.com",
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: null,
  tier: "free" as const,
  totalPages: 100,
  usedPages: 25,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date()
};

export const demoScripts = [
  {
    id: 1,
    title: "The Last Stand - Action Thriller",
    fileType: "pdf",
    fileSize: 2048576,
    pageCount: 85,
    userId: 1,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    content: `FADE IN:

EXT. ABANDONED WAREHOUSE - NIGHT

Rain pounds the cracked concrete. Detective SARAH CHEN (35) crouches behind a rusted car, her service weapon drawn.

SARAH
(into radio)
This is Detective Chen. I'm going in.

RADIO STATIC

DISPATCH (V.O.)
Negative, Chen. Wait for backup.

Sarah clicks off the radio, her jaw set with determination.

SARAH
Sorry, dispatch. Some things can't wait.

INT. WAREHOUSE - CONTINUOUS

Sarah enters through a side door, her flashlight cutting through the darkness.

A SOUND echoes from above - metal scraping against concrete.

Sarah freezes, listening. She begins to climb the metal stairs.

INT. WAREHOUSE - SECOND FLOOR - CONTINUOUS

The flickering light reveals a makeshift laboratory. MARCUS VALDEZ (45), scarred and dangerous, works over a steaming beaker.

MARCUS
I wondered when you'd find me, Detective.

He doesn't turn around. Sarah keeps her weapon trained on him.

SARAH
Step away from the table, Marcus. Hands where I can see them.

MARCUS
You know what this is? The future. A future you're trying to destroy.

SARAH
The only thing I see is a drug lab that's killed twelve people this month.

Marcus finally turns, his eyes cold and calculating.

MARCUS
Twelve people who made their choice. Just like you're about to make yours.

He lunges for a nearby table, knocking over equipment. Glass SHATTERS.

SARAH
Stop!

She fires a warning shot into the ceiling. Marcus dives behind overturned tables.

MARCUS
You'll never take me alive, Chen!

The smoke thickens. Sarah coughs, her eyes watering as she advances.

SARAH
This ends tonight, Marcus!

A figure emerges from the smoke - TOMMY NGUYEN (28), a young man with wild eyes and a knife.

TOMMY
She's got a gun!

Tommy charges at Sarah. She sidesteps and delivers a swift kick.

SARAH
Stay down!

Through the smoke, she sees Marcus climbing out a window onto the fire escape.

SARAH (CONT'D)
Damn it!

EXT. WAREHOUSE - FIRE ESCAPE - CONTINUOUS

Marcus descends rapidly, the metal structure groaning. Sarah follows, weapon drawn.

SARAH
LAPD! Stop!

She fires another warning shot. Marcus doesn't slow down.

EXT. CITY ALLEY - CONTINUOUS

Marcus vaults over a chain-link fence. Sarah follows, her jacket catching on wire.

They emerge onto a busy street. Marcus weaves between traffic, car horns BLARING.

SARAH
(into radio)
All units, suspect heading east on Fifth Street.

Marcus ducks into a 24-hour diner. Sarah follows.

INT. DINER - CONTINUOUS

Fluorescent lights hum overhead. Late-night customers look up in alarm.

SARAH
Everyone get down!

Patrons dive under tables. The WAITRESS (50s) screams.

Marcus grabs the waitress, pulling her against him as a human shield.

MARCUS
Back off, Chen! I'll hurt her!

SARAH
Let her go, Marcus. This is between you and me.

MARCUS
Nothing is between just you and me anymore. Your department, your city - it's all corrupt!

SARAH
Maybe so. But that doesn't give you the right to poison kids.

MARCUS
Those kids chose their poison. Just like this city chose its corruption.

SARAH
And what did you choose, Marcus? When did you decide innocent people had to die?

For a moment, uncertainty flickers across Marcus's face.

MARCUS
I never wanted... this wasn't supposed to...

Sarah takes a step closer.

SARAH
It's not too late. Let her go. We can work this out.

MARCUS
No! Too many people depend on me now!

He pushes the waitress away and bolts toward the kitchen.

INT. DINER KITCHEN - CONTINUOUS

Steam rises from commercial stoves. Marcus grabs a knife from the prep station.

SARAH
Put the knife down!

They circle each other warily in the cramped space.

MARCUS
You think you're saving this city? You're part of the problem!

He swipes at her with the knife. Sarah dodges, knocking over pots.

SARAH
The only problem here is you!

She strikes his wrist. The knife clatters away.

They grapple, crashing into equipment. Marcus pins Sarah against a wall.

MARCUS
Should have minded your own business!

Sarah brings her knee up hard. Marcus staggers back, gasping.

SARAH
This is my business!

She tackles him to the floor and manages to cuff him.

SARAH (CONT'D)
Marcus Valdez, you're under arrest.

Marcus lies still, finally defeated.

MARCUS
This won't change anything. There will be others.

SARAH
Maybe. But not tonight.

Blue and red lights flash through windows as backup arrives.

SARAH (CONT'D)
Tonight, the good guys win.

FADE OUT.`
  },
  {
    id: 2,
    title: "City of Dreams - Urban Drama", 
    fileType: "docx",
    fileSize: 1536000,
    pageCount: 102,
    userId: 1,
    createdAt: new Date('2024-01-10T14:20:00Z')
  },
  {
    id: 3,
    title: "Quantum Leap - Sci-Fi Adventure",
    fileType: "txt", 
    fileSize: 512000,
    pageCount: 67,
    userId: 1,
    createdAt: new Date('2024-01-05T09:15:00Z')
  }
];

export const demoParseJobs = [
  {
    id: 1,
    scriptId: 1,
    userId: 1,
    status: 'completed' as const,
    selectedColumns: ['Scene', 'Shot', 'Location', 'Characters', 'Action'],
    previewData: {
      scenes: [
        {
          sceneNumber: 1,
          sceneHeading: 'INT. WAREHOUSE - NIGHT',
          location: 'Warehouse',
          time: 'Night',
          characters: ['JACK', 'SARAH'],
          action: 'Jack and Sarah enter the dimly lit warehouse, guns drawn.',
          props: ['Flashlights', 'Weapons'],
          tone: 'Tense'
        },
        {
          sceneNumber: 2,
          sceneHeading: 'EXT. CITY STREET - DAY',
          location: 'City Street',
          time: 'Day',
          characters: ['MARCUS', 'ELENA'],
          action: 'Marcus races through crowded streets, Elena in pursuit.',
          props: ['Motorcycle', 'Helmet'],
          tone: 'Fast-paced'
        },
        {
          sceneNumber: 3,
          sceneHeading: 'INT. CONTROL ROOM - CONTINUOUS',
          location: 'Control Room',
          time: 'Continuous',
          characters: ['COMMANDER', 'TECH OPERATOR'],
          action: 'Commander monitors the chase on multiple screens.',
          props: ['Monitors', 'Keyboards', 'Radio'],
          tone: 'Urgent'
        }
      ]
    },
    fullParseData: [
      {
        Scene: '1',
        'Scene Heading': 'INT. WAREHOUSE - NIGHT',
        Location: 'Warehouse',
        Time: 'Night',
        Characters: 'JACK, SARAH',
        Action: 'Jack and Sarah enter the dimly lit warehouse, guns drawn.',
        Props: 'Flashlights, Weapons',
        Tone: 'Tense'
      },
      {
        Scene: '2',
        'Scene Heading': 'EXT. CITY STREET - DAY',
        Location: 'City Street',
        Time: 'Day',
        Characters: 'MARCUS, ELENA',
        Action: 'Marcus races through crowded streets, Elena in pursuit.',
        Props: 'Motorcycle, Helmet',
        Tone: 'Fast-paced'
      }
    ],
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T11:45:00Z')
  },
  {
    id: 2,
    scriptId: 2,
    userId: 1,
    status: 'processing' as const,
    selectedColumns: ['Scene', 'Characters', 'Dialogue'],
    previewData: null,
    fullParseData: null,
    createdAt: new Date('2024-01-10T14:20:00Z'),
    updatedAt: new Date('2024-01-10T14:25:00Z')
  }
];

export function getScriptById(id: number) {
  return demoScripts.find(script => script.id === id);
}

export function getJobById(id: number) {
  return demoParseJobs.find(job => job.id === id);
}

export function getJobsByScriptId(scriptId: number) {
  return demoParseJobs.filter(job => job.scriptId === scriptId);
}