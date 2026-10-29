# Employer Assessments

The **Assessments** page gives each job application its own employer assessment.
Use it to record evidence gathered from interviews, company research, and
conversations with current or former employees. Assessments are linked to an
application, not just its company, so different roles at the same employer can
have different findings.

## Create or update an assessment

1. Sign in and open **Assessments** in the main navigation.
2. Select the job application to review.
3. Set the assessment status and the career-growth, relocation, and final-fit
   summaries.
4. Score any criteria for which you have evidence. Leave unanswered criteria
   as **Not Assessed** rather than treating missing information as a low score.
5. Record evidence, outstanding questions, and specific red flags or concerns.
6. Save the assessment. Its last-assessed date is updated when saved.

The application must exist before its assessment can be created. If the
application is deleted, its assessment is deleted with it.

## Essential parameters

These are intended to help evaluate career development and relocation
suitability:

| Parameter | Consider |
| --- | --- |
| Career Growth & Progression | Internal progression, communicated criteria, and opportunities to demonstrate readiness. |
| Technical Challenge & Learning | Work complexity, skill development, architectural exposure, and growing responsibility. |
| Engineering Team & Management | Mentorship, feedback, leadership, reviews, and technical decision-making. |
| Ownership & Autonomy | Ownership of features, services, design decisions, deployment, and maintenance. |
| Company Growth & Opportunity | Whether business growth creates real opportunities for employees. |
| Employment & Relocation Viability | Work authorisation, relocation support, contract terms, and feasibility of moving. |
| Role Fit & Sustainability | Career direction, workload, on-call expectations, and lasting interest. |

## Nice-to-have parameters

These help compare opportunities when the essential considerations are
satisfactory:

- Salary & Benefits
- Technology Stack
- Product & Industry Interest
- Work Flexibility
- Learning Budget & Resources
- Company Reputation
- Employee Retention & Feedback
- International Team & Culture
- Future Mobility
- Location & Commute
- Interview Experience

Salary is grouped here for comparison purposes only. It still needs to meet
your financial needs before accepting an offer. Work authorisation and
relocation remain essential decision factors.

## Scores and evidence

Each criterion can be left unassessed or scored from 1 to 5. The page displays
separate essential and nice-to-have averages. Averages include only criteria
with a score, so unanswered questions do not lower the score. Scores do not
replace evidence: use the notes and questions to capture what is known,
unknown, and still needs verification.

The **Last Assessment Date** is set to the current date whenever the assessment
is saved. The **Assessment Status** is selected independently as Not Started,
In Progress, or Completed; it is not inferred from how many criteria have
scores.

The summary fields are:

- **Career Growth Outlook:** Strong, Moderate, Limited, or Unknown.
- **Relocation Feasibility:** Confirmed, Needs Verification, Unclear, or Not
  Feasible.
- **Final Employer Assessment:** Strong Fit, Potential Fit, Further
  Investigation, or Poor Fit.
- **Evidence & Notes**, **Outstanding Questions**, and **Red Flags / Concerns**:
  free-text records to support and qualify the assessment.

Use the assessment as a decision aid, not a promotion guarantee or immigration
determination. Confirm work-permit requirements with authoritative sources
before making relocation decisions.

## Data and API

Assessments are private to the application owner. The API exposes an
application's assessment through the authenticated
`/api/applications/<application-id>/assessment/` endpoint. A GET request
returns default values without creating a database record; PUT creates or
replaces the assessment and PATCH updates selected fields. Score keys and the
1–5 range are validated by the backend.
