import { uuid } from './uuid';
import { dbAddPlace, dbAddTask, dbIsEmpty } from './db';
import { Task, Place } from './types';

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export async function seedIfEmpty(): Promise<void> {
  if (!(await dbIsEmpty())) return;

  const placeHome     = uuid();
  const placeWork     = uuid();
  const placeAnywhere = uuid();

  const places: Place[] = [
    { id: placeAnywhere, name: 'Anywhere', color: '#888780', isOpen: true },
    { id: placeWork,     name: 'Work',     color: '#378ADD', isOpen: true },
    { id: placeHome,     name: 'Home',     color: '#1D9E75', isOpen: true },
  ];

  const workId   = uuid(); const familyId = uuid();
  const healthId = uuid(); const learnId  = uuid();
  const projectsId = uuid(); const adminId = uuid();
  const immediateId = uuid(); const extendedId = uuid();
  const fitnessId = uuid(); const nutritionId = uuid();
  const codingId  = uuid(); const languageId  = uuid();
  const now = new Date().toISOString();

  const tasks: Task[] = [
    { id: workId,   parentId: null, title: 'Work & Career',       notes: 'Professional growth and deliverables.', importance: 0.35, effortSize: 'medium', repeating: false, placeIds: [placeWork],     createdAt: now, updatedAt: now },
    { id: familyId, parentId: null, title: 'Family & Friends',    notes: 'Nurturing important relationships.',    importance: 0.30, effortSize: 'medium', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: healthId, parentId: null, title: 'Health & Wellbeing',  notes: 'Physical and mental health.',           importance: 0.25, effortSize: 'medium', repeating: false, placeIds: [placeHome],     createdAt: now, updatedAt: now },
    { id: learnId,  parentId: null, title: 'Learning & Growth',   notes: 'Continuous skill development.',         importance: 0.10, effortSize: 'small',  repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },

    { id: projectsId, parentId: workId, title: 'Active Projects', notes: '', importance: 0.8, effortSize: 'large', repeating: false, placeIds: [placeWork], createdAt: now, updatedAt: now },
    { id: adminId,    parentId: workId, title: 'Admin & Comms',   notes: '', importance: 0.2, effortSize: 'small', repeating: true, repeatDays: 1, placeIds: [placeWork], createdAt: now, updatedAt: now },

    { id: uuid(), parentId: projectsId, title: 'Finish Q3 client report',    notes: 'Section 3 still incomplete.', importance: 0.9, effortSize: 'large',  repeating: false, deadline: daysFromNow(3),  placeIds: [placeWork],     createdAt: now, updatedAt: now },
    { id: uuid(), parentId: projectsId, title: 'Review pull requests',        notes: '',                           importance: 0.6, effortSize: 'small',  repeating: true,  repeatDays: 2, placeIds: [placeWork], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: projectsId, title: 'Prepare project kickoff deck', notes: 'New client onboarding.',  importance: 0.7, effortSize: 'medium', repeating: false, deadline: daysFromNow(10), placeIds: [placeWork],     createdAt: now, updatedAt: now },
    { id: uuid(), parentId: adminId,    title: 'Clear email inbox',            notes: '',                           importance: 0.5, effortSize: 'small',  repeating: true,  repeatDays: 1, placeIds: [placeWork], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: adminId,    title: 'Send weekly status update',    notes: '',                           importance: 0.7, effortSize: 'tiny',   repeating: true,  repeatDays: 7, placeIds: [placeWork], createdAt: now, updatedAt: now },

    { id: immediateId, parentId: familyId, title: 'Household',               notes: '', importance: 0.7, effortSize: 'medium', repeating: false, placeIds: [placeHome],     createdAt: now, updatedAt: now },
    { id: extendedId,  parentId: familyId, title: 'Extended family & friends', notes: '', importance: 0.3, effortSize: 'small',  repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },

    { id: uuid(), parentId: immediateId, title: 'Plan weekend trip',    notes: 'Something outdoors, within 2 hours.', importance: 0.8, effortSize: 'small', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: immediateId, title: 'Grocery run',           notes: '',                                    importance: 0.6, effortSize: 'tiny',  repeating: true,  repeatDays: 5, placeIds: [placeHome], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: extendedId,  title: 'Call mom',              notes: 'Thanksgiving plans.',                 importance: 0.9, effortSize: 'tiny',  repeating: true,  repeatDays: 7, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: extendedId,  title: 'Send birthday card to Jamie', notes: '',                              importance: 0.7, effortSize: 'tiny',  repeating: false, deadline: daysFromNow(5), placeIds: [placeAnywhere], createdAt: now, updatedAt: now },

    { id: fitnessId,   parentId: healthId, title: 'Fitness',           notes: '', importance: 0.6, effortSize: 'medium', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: nutritionId, parentId: healthId, title: 'Nutrition & Sleep', notes: '', importance: 0.4, effortSize: 'small',  repeating: false, placeIds: [placeHome],     createdAt: now, updatedAt: now },

    { id: uuid(), parentId: fitnessId,   title: 'Morning run (30 min)',   notes: '',                      importance: 0.8, effortSize: 'medium', repeating: true,  repeatDays: 2,  placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: fitnessId,   title: 'Schedule annual physical', notes: 'Overdue 6 months.', importance: 0.9, effortSize: 'tiny',   repeating: false, deadline: daysFromNow(14), placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: nutritionId, title: 'Meal prep for the week', notes: '',                      importance: 0.7, effortSize: 'medium', repeating: true,  repeatDays: 7,  placeIds: [placeHome],     createdAt: now, updatedAt: now },

    { id: codingId,   parentId: learnId, title: 'Software skills', notes: '', importance: 0.6, effortSize: 'medium', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: languageId, parentId: learnId, title: 'Learn Italian',   notes: 'Trip to Rome planned.', importance: 0.4, effortSize: 'small', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },

    { id: uuid(), parentId: codingId,   title: 'Complete TypeScript course module 4', notes: '', importance: 0.7, effortSize: 'medium', repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: codingId,   title: 'Read two chapters of SICP',           notes: '', importance: 0.5, effortSize: 'small',  repeating: true,  repeatDays: 7, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: languageId, title: 'Buy Italian course or textbook',      notes: '', importance: 0.5, effortSize: 'tiny',   repeating: false, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
    { id: uuid(), parentId: languageId, title: 'Practice Italian (15 min daily)',     notes: '', importance: 0.8, effortSize: 'small',  repeating: true,  repeatDays: 1, placeIds: [placeAnywhere], createdAt: now, updatedAt: now },
  ];

  for (const p of places) await dbAddPlace(p);
  for (const t of tasks)  await dbAddTask(t);
}
