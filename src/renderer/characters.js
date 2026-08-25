// Companion Definitions, Expressions, and Dialogue

const CHARACTERS = {
  dinki: {
    id: 'dinki',
    name: 'Dinki',
    image: '../assets/dinki.png',
    themeColor: '#ff4081',
    secondaryColor: '#fff0f5',
    accentColor: '#7c4dff',
    badge: 'Break Assistant',
    voicePitch: 1.15,
    voiceRate: 1.0,
    dialogues: {
      entrance: "Time for a well-deserved break! Step back from your screen and take a breather.",
      tips: [
        "Remember the 20-20-20 rule: look at something 20 feet away for 20 seconds.",
        "Grab a glass of water to stay hydrated and refreshed.",
        "Roll your shoulders backwards and release tension from your neck.",
        "Take a slow, deep breath in... and gently exhale.",
        "Resting your eyes regularly keeps your focus sharp all day.",
        "Stand up and do a quick stretch to get your circulation going."
      ],
      stretch: "Stand up and stretch your arms up toward the ceiling.",
      almostDone: "Break is wrapping up soon. Get ready to dive back in refreshed!",
      exit: "Great job taking a break! Let's get back to it with fresh energy."
    }
  },
  poko: {
    id: 'poko',
    name: 'Poko',
    image: '../assets/poko.png',
    themeColor: '#f59e0b',
    secondaryColor: '#fffbeb',
    accentColor: '#d97706',
    badge: 'Break Assistant',
    voicePitch: 1.25,
    voiceRate: 1.0,
    dialogues: {
      entrance: "Squeak! Time for a recharge break! Step away and let's stretch together.",
      tips: [
        "Don't forget to grab a fresh drink of water to stay energized.",
        "Roll your shoulders and wiggle your fingers to release tension.",
        "Look out the window for 20 seconds to give your eyes a rest.",
        "Take three slow, deep breaths in... and exhale calmly.",
        "Stand up and do a gentle stretch to get your circulation going.",
        "Resting your mind helps you stay creative and focused."
      ],
      stretch: "Stand up on your paws and reach up high towards the sky!",
      almostDone: "Break is almost done! Get ready to jump back in refreshed and ready to go.",
      exit: "Awesome job taking care of yourself! Let's get back to work."
    }
  },
  ren: {
    id: 'ren',
    name: 'Ren',
    image: '../assets/ren.png',
    themeColor: '#38bdf8',
    secondaryColor: '#f0f9ff',
    accentColor: '#0284c7',
    badge: 'Break Assistant',
    voicePitch: 0.95,
    voiceRate: 1.0,
    dialogues: {
      entrance: "Good work so far. Step away from your desk and take a breather.",
      tips: [
        "Resting your eyes for 20 seconds now will keep your focus sharp later.",
        "Grab a glass of water and stay hydrated while you're in the zone.",
        "Roll your shoulders and loosen your neck to avoid stiffness.",
        "Take a steady, deep breath in... and let it out slowly.",
        "Stand up, stretch your legs, and let your mind recharge.",
        "Consistent short breaks lead to much better long-term results."
      ],
      stretch: "Stand up straight, clasp your hands behind your back, and open your chest.",
      almostDone: "Break is wrapping up shortly. Let's finish strong when we get back.",
      exit: "Nice recharge. Let's get back to it with clear focus."
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CHARACTERS
}
