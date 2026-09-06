import {createHash} from 'node:crypto';
export {languages,bounty,getLanguage} from './catalog.js';
export const source={
  "id": "open-source-guide-2026-09-06",
  "title": "How to Contribute to Open Source",
  "fictional": false,
  "url": "https://opensource.guide/how-to-contribute/",
  "attribution": "GitHub and Open Source Guides contributors",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "checkedAt": "2026-09-06",
  "revision": "8d6a91ea97df40bd381f7859eb8f2e3325b22e1b",
  "snapshotUrl": "https://github.com/github/opensource.guide/blob/8d6a91ea97df40bd381f7859eb8f2e3325b22e1b/_articles/how-to-contribute.md",
  "notice": "Selected excerpts from a real public guide. Formatting has been simplified. Starter answers and Hindi explanations are Pass It On adaptations, not official GitHub translations or endorsements. Check the target project’s own contribution instructions.",
  "sections": [
    {
      "id": "O1",
      "title": "Contributing without code",
      "anchor": "what-it-means-to-contribute",
      "text": "Even if you're a software developer, working on a documentation project can help you get started in open source. It's often less intimidating to work on projects that don't involve code, and the process of collaboration will build your confidence and experience."
    },
    {
      "id": "O2",
      "title": "Before you start work",
      "anchor": "gathering-context",
      "text": "Before you open an issue or pull request, check the project's contributing docs (usually a file called CONTRIBUTING, or in the README), to see whether you need to include anything specific. For example, they may ask that you follow a template, or require that you use tests. If you want to make a substantial contribution, open an issue to ask before working on it."
    },
    {
      "id": "O3",
      "title": "Preparing a pull request",
      "anchor": "opening-a-pull-request",
      "text": "Reference any relevant issues or supporting documentation in your PR (for example, \"Closes #37.\") Test your changes! Run your changes against any existing tests if they exist and create new ones when needed. It's important to make sure your changes don't break the existing project."
    }
  ]
};
export const sourceVersion=createHash('sha256').update(JSON.stringify(source)).digest('hex');
export const questions=[
  {
    "id": "oss-non-code",
    "title": "Can I contribute without writing code?",
    "sectionIds": [
      "O1"
    ],
    "language": "en",
    "topic": "Can I contribute without writing code?",
    "openingHi": "क्या कोड लिखे बिना ओपन सोर्स में योगदान दिया जा सकता है? दस्तावेज़ों पर काम करने का एक तरीका समझाइए।",
    "examples": {
      "wrong": "Only programmers can contribute to open source. Documentation projects do not count as contributions.",
      "correct": "Yes. Working on a documentation project is a way to get started in open source without writing code. Collaborating there can help build confidence and experience."
    }
  },
  {
    "id": "oss-before-work",
    "title": "What should I check before starting?",
    "sectionIds": [
      "O2"
    ],
    "language": "en",
    "topic": "What should I check before starting?",
    "openingHi": "काम शुरू करने से पहले क्या जाँचना चाहिए? योगदान के निर्देश और बड़े बदलाव से पहले चर्चा समझाइए।",
    "examples": {
      "wrong": "Ignore CONTRIBUTING files. Start a substantial change immediately and ask the maintainers only after you finish.",
      "correct": "Read the project’s CONTRIBUTING file or README before opening an issue or pull request. Follow requirements such as templates or tests. For a substantial contribution, open an issue to ask before starting work."
    }
  },
  {
    "id": "oss-pull-request",
    "title": "How do I prepare a useful pull request?",
    "sectionIds": [
      "O3"
    ],
    "language": "en",
    "topic": "How do I prepare a useful pull request?",
    "openingHi": "एक उपयोगी पुल रिक्वेस्ट कैसे तैयार करें? संबंधित मुद्दों का संदर्भ देने और बदलावों की जाँच करने के बारे में बताइए।",
    "examples": {
      "wrong": "A pull request does not need related issue references, documentation or tests. Maintainers will test everything for you.",
      "correct": "Reference relevant issues or supporting documentation in the pull request. Run existing tests when they exist and add new tests when needed. Check that the changes do not break the project."
    }
  }
];
const starters={
  "oss-non-code": {
    "en": [
      "Yes. Working on a documentation project is a way to get started in open source without writing code. Collaborating there can help build confidence and experience."
    ],
    "hi": [
      "हाँ। आप कोड लिखे बिना दस्तावेज़ों से जुड़े प्रोजेक्ट में योगदान शुरू कर सकते हैं। साथ काम करने से आत्मविश्वास और अनुभव बढ़ाने में मदद मिल सकती है।"
    ]
  },
  "oss-before-work": {
    "en": [
      "Read the project’s CONTRIBUTING file or README before opening an issue or pull request. Follow requirements such as templates or tests. For a substantial contribution, open an issue to ask before starting work."
    ],
    "hi": [
      "इश्यू या पुल रिक्वेस्ट खोलने से पहले प्रोजेक्ट की CONTRIBUTING फ़ाइल या README पढ़ें। बताए गए टेम्पलेट और परीक्षण संबंधी निर्देशों का पालन करें। बड़ा योगदान शुरू करने से पहले एक इश्यू खोलकर पूछें।"
    ]
  },
  "oss-pull-request": {
    "en": [
      "Reference relevant issues or supporting documentation in the pull request. Run existing tests when they exist and add new tests when needed. Check that the changes do not break the project."
    ],
    "hi": [
      "अपने पुल रिक्वेस्ट में संबंधित इश्यू या दस्तावेज़ों का संदर्भ दें। उपलब्ध परीक्षण चलाएँ और आवश्यकता होने पर नए परीक्षण जोड़ें। जाँचें कि आपके बदलाव से प्रोजेक्ट खराब न हो।"
    ]
  }
};
export function getQuestion(id){const q=questions.find(q=>q.id===id);if(!q)throw Object.assign(new Error('Choose a question from this guide.'),{status:400});return q;}
export function starterAnswer(questionId,language){const q=getQuestion(questionId),texts=starters[questionId]?.[language];if(!texts)return null;const s=source.sections.find(s=>s.id===q.sectionIds[0]);return {kind:'starter',preparedAt:source.checkedAt,claims:texts.map(text=>({text,sectionId:s.id,title:s.title,quote:s.text}))};}
export const collection={id:'open-source',title:'Your first open-source contribution'};
