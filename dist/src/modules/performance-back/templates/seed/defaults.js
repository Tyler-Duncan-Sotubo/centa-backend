"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questions = exports.competencies = void 0;
exports.competencies = [
    {
        name: 'Accountability',
        description: 'Takes responsibility for results and follows through on commitments.',
    },
    {
        name: 'Attendance',
        description: 'Regular and punctual presence at work.',
    },
    {
        name: 'Communication',
        description: 'Effectively conveys ideas and listens to others.',
    },
    {
        name: 'Customer Service',
        description: 'Delivers helpful, courteous, and knowledgeable service.',
    },
    {
        name: 'Job Knowledge',
        description: 'Understands the duties and responsibilities of the job.',
    },
    {
        name: 'Leadership',
        description: 'Inspires, guides, and supports others to perform.',
    },
    {
        name: 'Problem Solving',
        description: 'Identifies issues and provides effective solutions.',
    },
    {
        name: 'Productivity',
        description: 'Efficiently completes tasks and manages time well.',
    },
    {
        name: 'Quality of Work',
        description: 'Delivers accurate, thorough, and high-standard work.',
    },
    {
        name: 'Self-Development',
        description: 'Seeks opportunities to grow skills and knowledge.',
    },
    {
        name: 'Skills',
        description: 'Demonstrates the technical or functional skills for the role.',
    },
    {
        name: 'Teamwork',
        description: 'Collaborates effectively with others to achieve goals.',
    },
    {
        name: 'Technical',
        description: 'Demonstrates specific technical knowledge required for the role.',
    },
];
exports.questions = [
    {
        competency: 'Communication',
        questions: [
            {
                question: 'How clearly does the employee communicate in verbal interactions?',
                type: 'rating',
                isMandatory: true,
                allowNotes: true,
            },
            {
                question: 'Does the employee communicate effectively in writing?',
                type: 'yes_no',
            },
            {
                question: 'How well does the employee listen and respond to feedback?',
                type: 'rating',
                allowNotes: true,
            },
        ],
    },
    {
        competency: 'Teamwork',
        questions: [
            {
                question: 'Does the employee actively participate in team discussions?',
                type: 'yes_no',
            },
            {
                question: 'How well does the employee support team members?',
                type: 'rating',
            },
            {
                question: 'Describe how the employee contributes to team success.',
                type: 'text',
                allowNotes: true,
            },
        ],
    },
    {
        competency: 'Problem Solving',
        questions: [
            {
                question: 'Can the employee identify the root cause of issues?',
                type: 'yes_no',
                isMandatory: true,
            },
            {
                question: 'Describe how the employee approaches problem solving.',
                type: 'text',
            },
            {
                question: 'How effectively does the employee develop creative solutions?',
                type: 'rating',
            },
        ],
    },
    {
        competency: 'Leadership',
        questions: [
            {
                question: 'Does the employee take initiative in leading tasks or projects?',
                type: 'yes_no',
            },
            {
                question: 'How does the employee influence or inspire others?',
                type: 'text',
                allowNotes: true,
            },
            {
                question: 'Rate the employee’s ability to lead by example.',
                type: 'rating',
            },
        ],
    },
    {
        competency: 'Job Knowledge',
        questions: [
            {
                question: 'Does the employee demonstrate strong knowledge of their job?',
                type: 'rating',
                isMandatory: true,
            },
            {
                question: 'Is the employee up to date with industry best practices?',
                type: 'yes_no',
            },
        ],
    },
    {
        competency: 'Customer Service',
        questions: [
            {
                question: 'How well does the employee handle customer interactions?',
                type: 'rating',
                isMandatory: true,
            },
            {
                question: 'Is the employee responsive to customer needs?',
                type: 'yes_no',
            },
        ],
    },
    {
        competency: 'Self-Development',
        questions: [
            {
                question: 'Does the employee pursue training or learning opportunities?',
                type: 'yes_no',
            },
            {
                question: 'Describe how the employee works on personal growth.',
                type: 'text',
            },
        ],
    },
    {
        competency: 'Productivity',
        questions: [
            {
                question: 'Is the employee able to meet deadlines consistently?',
                type: 'yes_no',
            },
            {
                question: 'Rate the employee’s efficiency in completing tasks.',
                type: 'rating',
            },
        ],
    },
    {
        competency: 'Quality of Work',
        questions: [
            {
                question: 'How accurate and thorough is the employee’s work?',
                type: 'rating',
                isMandatory: true,
            },
            {
                question: 'Describe any recurring quality issues (if applicable).',
                type: 'text',
            },
        ],
    },
    {
        competency: 'Technical',
        questions: [
            {
                question: 'Does the employee demonstrate the necessary technical skills?',
                type: 'rating',
            },
            {
                question: 'Is the employee able to troubleshoot technical issues independently?',
                type: 'yes_no',
            },
        ],
    },
];
//# sourceMappingURL=defaults.js.map