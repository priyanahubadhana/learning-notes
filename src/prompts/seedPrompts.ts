import {
  SKILL_PARTS,
  newPrompt,
  type InputKind,
  type OutputKind,
  type Purpose,
  type SkillPart,
} from './promptModel'
import type { PromptItem } from './promptModel'

/**
 * The shipped prompts and skills (lazy chunk: loaded only when the library
 * opens). Our own wording. Four are rewritten ideas from the CC0 collection
 * awesome-chatgpt-prompts (github.com/f/awesome-chatgpt-prompts, CC0 1.0):
 * the wording is ours, the licence note is kept in each row.
 */

const OWN = 'Own text, free to use and change.'
const CC0 =
  'Idea from awesome-chatgpt-prompts (CC0 1.0, github.com/f/awesome-chatgpt-prompts); wording rewritten.'

function prompt(
  id: string,
  name: string,
  purpose: Purpose,
  subjects: string[],
  text: string,
  o: {
    input?: InputKind
    output?: OutputKind
    licence?: string
  } = {},
): PromptItem {
  return {
    ...newPrompt('prompt'),
    starterId: id,
    name,
    purpose,
    subjects,
    text,
    input: o.input ?? 'page',
    output: o.output ?? 'answer',
    licence: o.licence ?? OWN,
  }
}

function skill(
  id: string,
  name: string,
  subjects: string[],
  text: string,
  parts: readonly SkillPart[] = SKILL_PARTS,
  input: InputKind = 'text',
): PromptItem {
  return {
    ...newPrompt('skill'),
    starterId: id,
    name,
    purpose: 'summarise',
    subjects,
    text,
    input,
    parts: [...parts],
    licence: OWN,
  }
}

/**
 * Paste-in prompts for NotebookLM chat: the owner pastes one there and copies
 * the answer back; "Bring in from NotebookLM" reads exactly this shape
 * (src/share/notebooklm/parse.ts and its tests use these same texts).
 */
export const NLM_MINDMAP_PROMPT =
  'Write a mind map of the sources as an indented outline and nothing else. The first line is the central topic, written as "- Topic". Every other line starts with "- " and is indented two spaces for each level below its parent. Use at most 4 levels, short phrases, no bold, no numbers, no extra text before or after.'
export const NLM_QUIZ_PROMPT =
  'Write a quiz from the sources as a list of questions with their answers. Use exactly this shape, with one blank line between questions and nothing else:\n\nQ: the question\nA: the correct answer in a short line\n\nWrite 10 to 20 questions. For a multiple-choice question put the options in the Q line, like "Which is largest? (a) Sun (b) Moon (c) Mars", and give the right option in the A line.'
export const NLM_INFOGRAPHIC_PROMPT =
  'Write the content of an infographic about the sources as Markdown and nothing else. Start with the title as "# Title". Then write 4 to 8 sections, each "## Heading" followed by 2 to 4 lines starting with "- ", one short fact per line. No tables, no pictures, no text outside this shape.'

export const SEEDS: readonly PromptItem[] = [
  prompt(
    'own.nlm.mindmap',
    'Mind map as indented outline',
    'import',
    ['notebooklm', 'mind map'],
    NLM_MINDMAP_PROMPT,
    { input: 'text', output: 'notes' },
  ),
  prompt(
    'own.nlm.quiz',
    'Quiz as Q/A list with answers',
    'import',
    ['notebooklm', 'quiz'],
    NLM_QUIZ_PROMPT,
    { input: 'text', output: 'cards' },
  ),
  prompt(
    'own.nlm.infographic',
    'Infographic content as headings and bullets',
    'import',
    ['notebooklm', 'infographic'],
    NLM_INFOGRAPHIC_PROMPT,
    { input: 'text', output: 'notes' },
  ),
  prompt(
    'own.summarise',
    'Summarise',
    'summarise',
    ['general'],
    'Summarise the text in 4 to 8 short sentences, in the same language as the text. Use only what the text says.',
  ),
  prompt(
    'own.keypoints',
    'Key points',
    'keyPoints',
    ['general'],
    'Write the key points of the text as short bullet lines (6 to 12), one idea per line, in the same language. Put the most important first.',
    { output: 'notes' },
  ),
  prompt(
    'own.cards',
    'Make recall cards',
    'recall',
    ['general', 'exam'],
    'Write question and answer recall cards from the text. One idea per card, a short question, a short answer. 6 to 15 cards.',
    { output: 'cards' },
  ),
  prompt(
    'own.cloze',
    'Make fill-in-the-blank cards',
    'recall',
    ['general', 'exam'],
    'Write sentences from the text with the key word hidden as {{word}}. One hidden word per sentence. 6 to 15 sentences.',
    { output: 'cards' },
  ),
  prompt(
    'own.explain',
    'Explain it like I am new',
    'understand',
    ['general', 'beginner'],
    'Explain the text to someone who has never met the topic. Use plain words, one everyday example, and end with the one thing to remember.',
  ),
  prompt(
    'own.quiz',
    'Quiz me',
    'practise',
    ['general', 'exam'],
    'Ask me 5 questions about the text, one at a time, from easy to hard. Wait for my answer, then say what was right and what was missing. Keep a score.',
  ),
  prompt(
    'own.gaps',
    'Find the gaps',
    'check',
    ['general', 'deep'],
    'Read my notes and list what is missing, unclear or possibly wrong. For each point say why and what to check. Do not rewrite the notes.',
  ),
  prompt(
    'own.translate',
    'Translate and keep the terms',
    'write',
    ['languages'],
    'Translate the text into the language I name. Keep technical terms in the original language in brackets after the translation. Keep the layout.',
  ),
  prompt(
    'own.storysofar',
    'Story so far (no spoilers)',
    'summarise',
    ['reading', 'books'],
    'Recap what has happened in this text so far in 6 to 10 lines. Name the people and what each wants. Do not guess or say what comes next.',
  ),
  prompt(
    'own.handwriting',
    'Fix my handwriting text',
    'write',
    ['general'],
    'This text came from reading handwriting and has mistakes. Fix spelling and spacing, keep my words and order, and mark any word you are unsure of with [?].',
  ),
  prompt(
    'own.studyplan',
    'Study plan for a chapter',
    'plan',
    ['general', 'exam'],
    'Make a 7 day plan to learn this chapter. Each day: what to read, what to recall from memory, and a 10 minute check. Keep each day under 45 minutes.',
  ),
  prompt(
    'own.teachback',
    'Teach it back (Feynman check)',
    'check',
    ['general', 'deep'],
    'I will explain this topic in my own words. Tell me where my explanation is wrong, vague or jumps a step, then ask me one question to fix the weakest part.',
  ),
  prompt(
    'cc0.socratic',
    'Socratic tutor',
    'understand',
    ['general', 'deep'],
    'Be my tutor. Do not give the answer. Ask one short question at a time that leads me to work it out myself, and only explain when I am stuck twice.',
    { licence: CC0 },
  ),
  prompt(
    'cc0.interview',
    'Interviewer',
    'practise',
    ['career', 'exam'],
    'Interview me for the role or exam I name. Ask one question at a time, wait for my answer, then give a short mark out of 10 and one way to improve it.',
    { licence: CC0 },
  ),
  prompt(
    'cc0.debate',
    'Debate partner',
    'practise',
    ['humanities', 'deep'],
    'Take the opposite side of my argument and make the best case for it in 5 lines. Then point out the weakest step in my own argument.',
    { licence: CC0 },
  ),
  prompt(
    'cc0.plainEnglish',
    'Plain language editor',
    'write',
    ['writing'],
    'Rewrite the text in plain language: short sentences, common words, active voice. Keep every fact and name. Do not add anything.',
    { licence: CC0 },
  ),
  skill(
    'own.skill.lecture',
    'Transcript to study set',
    ['lecture', 'general'],
    'The input is a lecture or video transcript. Make detailed pages by topic, keep the speaker order where it helps, and write cards that test the Must-know points first.',
  ),
  skill(
    'own.skill.research',
    'Article to research book',
    ['research', 'deep'],
    'The input is an article or paper. Separate claims from evidence. Give every claim a source number from the references named in the text. Mark claims the text does not support as unsourced.',
  ),
  skill(
    'own.skill.digest',
    'Quick digest',
    ['general'],
    'Make a very short digest: keywords, a short summary and the Must-know points only.',
    ['keywords', 'summary', 'rows'],
  ),
]
