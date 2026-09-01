export type Muscle = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';
export type Equipment = 'barbell' | 'dumbbells' | 'bodyweight' | 'machine' | 'cables';

export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  compound: boolean;
  /** Short form cues shown on the exercise guide screen. */
  cues: string[];
};

export const MUSCLES: { key: Muscle; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'legs', label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'core', label: 'Core' },
];

export const EQUIPMENT: { key: Equipment; label: string }[] = [
  { key: 'dumbbells', label: 'Dumbbells' },
  { key: 'barbell', label: 'Barbell' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'machine', label: 'Machines' },
  { key: 'cables', label: 'Cables' },
];

export const EXERCISES: Exercise[] = [
  // ---- chest ----
  { id: 'bench-press', name: 'Barbell Bench Press', muscle: 'chest', equipment: 'barbell', compound: true,
    cues: ['Plant both feet and squeeze your shoulder blades down and together.',
           'Lower the bar to mid-chest with elbows at roughly 45°, not flared to 90°.',
           'Touch the chest under control, then drive the bar back over your shoulders.',
           'Keep your wrists stacked over your forearms throughout.'] },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbells', compound: true,
    cues: ['Set the bench to 30°. Steeper than that shifts the work to your shoulders.',
           'Start with the dumbbells just outside your chest, palms facing forward.',
           'Press up and slightly inward without clanging the bells together.'] },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'chest', equipment: 'cables', compound: false,
    cues: ['Set the pulleys at chest height and take one step forward for tension.',
           'Keep a soft, fixed bend in the elbows — this is a hug, not a press.',
           'Squeeze for a beat at the midline before letting the arms open slowly.'] },
  { id: 'push-up', name: 'Push-Up', muscle: 'chest', equipment: 'bodyweight', compound: true,
    cues: ['Hands just wider than shoulders, body in one straight line from head to heels.',
           'Brace your abs and glutes so your hips do not sag.',
           'Lower until your chest is a fist off the floor.'] },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscle: 'chest', equipment: 'machine', compound: true,
    cues: ['Set the seat so the handles line up with the middle of your chest.',
           'Keep your back against the pad and press without shrugging.'] },

  // ---- back ----
  { id: 'pull-up', name: 'Pull-Up', muscle: 'back', equipment: 'bodyweight', compound: true,
    cues: ['Grip just outside shoulder width and hang with your shoulders active, not slack.',
           'Lead with your elbows driving down toward your ribs.',
           'Clear the bar with your chin, then lower all the way under control.'] },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'back', equipment: 'barbell', compound: true,
    cues: ['Hinge to about 45° with a flat back and braced core.',
           'Pull the bar to your lower ribs, not your collarbone.',
           'Keep the bar close to your body — let it drift and your lower back pays.'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'machine', compound: true,
    cues: ['Lock your thighs under the pad so you are not lifting off the seat.',
           'Lean back only slightly and pull the bar to your upper chest.',
           'Resist the way up — the negative is where most of the growth is.'] },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscle: 'back', equipment: 'cables', compound: true,
    cues: ['Sit tall with a slight knee bend; do not round forward to reach.',
           'Pull to your belly button and squeeze your shoulder blades together.'] },
  { id: 'db-row', name: 'One-Arm Dumbbell Row', muscle: 'back', equipment: 'dumbbells', compound: true,
    cues: ['Brace your free hand on a bench with a flat back.',
           'Row the bell to your hip, not straight up to your shoulder.'] },
  { id: 'face-pull', name: 'Face Pull', muscle: 'back', equipment: 'cables', compound: false,
    cues: ['Set the rope at eye height and pull toward your forehead.',
           'Finish with your knuckles beside your ears and elbows high.'] },

  // ---- legs ----
  { id: 'squat', name: 'Barbell Squat', muscle: 'legs', equipment: 'barbell', compound: true,
    cues: ['Bar on your upper back, feet shoulder width, toes turned out slightly.',
           'Brace as if bracing for a punch, then sit down and back together.',
           'Break parallel if your mobility allows, keeping knees tracking over toes.',
           'Drive through your midfoot — not your toes — on the way up.'] },
  { id: 'rdl', name: 'Romanian Deadlift', muscle: 'legs', equipment: 'barbell', compound: true,
    cues: ['Start standing, soft knees, bar against your thighs.',
           'Push your hips straight back and let the bar graze your legs.',
           'Stop when you feel a strong hamstring stretch — usually just below the knee.',
           'This is a hinge, not a squat. The knees barely move.'] },
  { id: 'deadlift', name: 'Deadlift', muscle: 'legs', equipment: 'barbell', compound: true,
    cues: ['Bar over midfoot, shins almost touching it.',
           'Take the slack out of the bar before you pull — no jerking off the floor.',
           'Push the floor away and finish tall; do not lean back at the top.'] },
  { id: 'leg-press', name: 'Leg Press', muscle: 'legs', equipment: 'machine', compound: true,
    cues: ['Feet shoulder width in the middle of the platform.',
           'Lower until your knees reach about 90° without your hips curling off the pad.',
           'Never lock the knees out hard at the top.'] },
  { id: 'walking-lunge', name: 'Walking Lunge', muscle: 'legs', equipment: 'dumbbells', compound: true,
    cues: ['Step out far enough that your front shin stays close to vertical.',
           'Drop the back knee toward the floor, then drive through the front heel.'] },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'legs', equipment: 'machine', compound: false,
    cues: ['Line the machine pivot up with your knee joint.',
           'Curl fully, pause, and lower slowly.'] },
  { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'legs', equipment: 'dumbbells', compound: true,
    cues: ['Hold one bell at your chest like a goblet; elbows inside your knees at the bottom.',
           'Keep your chest tall — the weight in front helps you stay upright.'] },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscle: 'legs', equipment: 'machine', compound: false,
    cues: ['Let your heels drop for a full stretch before every rep.',
           'Pause at the top; bouncing turns this into a tendon exercise.'] },

  // ---- shoulders ----
  { id: 'overhead-press', name: 'Overhead Press', muscle: 'shoulders', equipment: 'barbell', compound: true,
    cues: ['Squeeze your glutes to stop your lower back arching.',
           'Move your head back slightly so the bar travels straight up past your face.',
           'Finish with the bar over the middle of your feet, biceps by your ears.'] },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscle: 'shoulders', equipment: 'dumbbells', compound: true,
    cues: ['Start at ear height with palms forward.',
           'Press up and slightly together without shrugging your traps.'] },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'shoulders', equipment: 'dumbbells', compound: false,
    cues: ['Lead with your elbows, not your hands.',
           'Stop at shoulder height — higher brings the traps in.',
           'Go lighter than you think; momentum kills this one.'] },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscle: 'shoulders', equipment: 'dumbbells', compound: false,
    cues: ['Hinge forward to about 45° and let your arms hang.',
           'Open your arms wide with a fixed elbow bend.'] },
  { id: 'pike-push-up', name: 'Pike Push-Up', muscle: 'shoulders', equipment: 'bodyweight', compound: true,
    cues: ['Walk your feet in so your hips stack high over your shoulders.',
           'Lower the crown of your head toward the floor between your hands.'] },

  // ---- arms ----
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'arms', equipment: 'barbell', compound: false,
    cues: ['Keep your elbows pinned at your sides the whole set.',
           'Do not swing the weight up with your lower back.'] },
  { id: 'db-curl', name: 'Dumbbell Curl', muscle: 'arms', equipment: 'dumbbells', compound: false,
    cues: ['Supinate as you curl — finish with your pinky higher than your thumb.',
           'Lower over a slow count of three.'] },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'arms', equipment: 'dumbbells', compound: false,
    cues: ['Neutral grip throughout, thumbs up.',
           'Keep your wrists straight and elbows still.'] },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscle: 'arms', equipment: 'cables', compound: false,
    cues: ['Tuck your elbows to your ribs and keep them there.',
           'Push down to a full lockout, then let the cable stretch the triceps.'] },
  { id: 'skullcrusher', name: 'Skullcrusher', muscle: 'arms', equipment: 'barbell', compound: false,
    cues: ['Lower the bar behind your head rather than straight to your forehead.',
           'Only the forearms move; the upper arms stay angled back.'] },
  { id: 'dip', name: 'Dip', muscle: 'arms', equipment: 'bodyweight', compound: true,
    cues: ['Stay upright for triceps; lean forward to bias the chest.',
           'Lower until your upper arms are parallel to the floor.'] },

  // ---- core ----
  { id: 'plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight', compound: false,
    cues: ['Elbows under shoulders, body in one line.',
           'Tuck your pelvis slightly and squeeze your glutes — do not sag.'] },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'core', equipment: 'bodyweight', compound: false,
    cues: ['Start from a dead hang without swinging.',
           'Curl your pelvis up rather than just lifting your legs.'] },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'cables', compound: false,
    cues: ['Kneel under the rope and hold it beside your head.',
           'Crunch your ribs toward your hips; the hips stay put.'] },
  { id: 'dead-bug', name: 'Dead Bug', muscle: 'core', equipment: 'bodyweight', compound: false,
    cues: ['Press your lower back into the floor and keep it there.',
           'Extend the opposite arm and leg slowly, then switch.'] },
];

export const byId = (id: string) => EXERCISES.find((e) => e.id === id);

export const exerciseName = (id: string) => byId(id)?.name ?? 'Exercise';

export const equipmentLabel = (k: Equipment) =>
  EQUIPMENT.find((e) => e.key === k)?.label ?? k;

export const muscleLabel = (k: Muscle) =>
  MUSCLES.find((m) => m.key === k)?.label ?? k;
