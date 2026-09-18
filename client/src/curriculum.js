// Cameroon GCE (Anglophone) secondary school structure: Form 1-5 (O-Level),
// then Lower Sixth / Upper Sixth (A-Level). Branching into Arts / Science /
// Commercial starts at Form 4 and is mandatory at Sixth Form.

export const CLASS_LEVELS = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Lower Sixth',
  'Upper Sixth',
];

export const BRANCHES = ['Arts', 'Science', 'Commercial'];

export function classRequiresBranch(className) {
  return ['Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'].includes(className);
}

export function isAdvancedLevel(className) {
  return ['Lower Sixth', 'Upper Sixth'].includes(className);
}

const LOWER_SECONDARY_SUBJECTS = [
  'English Language',
  'French',
  'Mathematics',
  'Biology',
  'Physics',
  'Chemistry',
  'History',
  'Geography',
  'Citizenship Education',
  'Computer Science',
  'Religious Studies',
  'Physical Education',
  'Fine Art',
  'Music',
  'Home Economics',
  'Agricultural Science',
];

const O_LEVEL_SUBJECTS = {
  Science: [
    'English Language', 'French', 'Mathematics', 'Additional Mathematics',
    'Physics', 'Chemistry', 'Biology', 'Geography', 'Computer Science',
    'Religious Studies', 'Physical Education',
  ],
  Arts: [
    'English Language', 'French', 'Literature in English', 'History', 'Geography',
    'Religious Studies', 'Citizenship Education', 'Economics', 'Mathematics', 'Computer Science',
  ],
  Commercial: [
    'English Language', 'French', 'Mathematics', 'Commerce', 'Principles of Accounts',
    'Economics', 'Geography', 'Computer Science', 'Office Practice',
  ],
};

const A_LEVEL_SUBJECTS = {
  Science: [
    'General Paper', 'Pure Mathematics', 'Further Mathematics', 'Physics',
    'Chemistry', 'Biology', 'Computer Science', 'Geology',
  ],
  Arts: [
    'General Paper', 'Literature in English', 'History', 'Geography',
    'Religious Studies', 'Economics', 'French', 'Philosophy', 'Citizenship Education',
  ],
  Commercial: [
    'General Paper', 'Accounting', 'Business Management', 'Economics',
    'Commerce', 'Statistics', 'Law', 'Geography',
  ],
};

export function subjectsFor(className, branch) {
  if (!classRequiresBranch(className)) return LOWER_SECONDARY_SUBJECTS;
  const table = isAdvancedLevel(className) ? A_LEVEL_SUBJECTS : O_LEVEL_SUBJECTS;
  return table[branch] || [];
}
