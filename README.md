# Origin — URLA-aligned mortgage workflow prototype

A dependency-free front-end prototype for a U.S. residential mortgage intake and origination workflow. Navigation stages are Overview, Application & Pre-qualification, Processing, Underwriting, Closing, and Funding. The multi-step intake is organized around the borrower-facing sections of the redesigned Uniform Residential Loan Application (URLA), Fannie Mae Form 1003 / Freddie Mac Form 65.

## Run it

Open `index.html` in a modern browser. No build step, server, or package installation is required.

## Prototype boundaries

- This is a URLA-aligned demonstration, **not** the official Form 1003/Form 65, a complete implementation, a compliance certification, or a substitute for a lender's approved application.
- Application data is held in JavaScript memory only. Refreshing or closing the page clears it. Do not enter real applicant, identity, financial, demographic, or other sensitive information.
- Social Security number, identity-document capture, complete additional-borrower Form 1003A/65A support, fully itemized assets/liabilities and real-estate schedules, signatures, MISMO mapping, automated underwriting, and the full lender-use section are intentionally not implemented. Use the current official GSE forms and a properly secured lender system for production.
- The app does not transmit data, call credit bureaus, verify identity/income/assets, create disclosures or loan documents, issue pre-qualification, or make automated underwriting decisions.
- URLA requiredness is context- and lender-process-dependent. Client-side checks here are illustrative form-completeness checks, not legal, underwriting, or eligibility rules.
- Demographic answers are optional in the borrower interface, with URLA-style ethnicity choices, race multi-selection, and refusal options. Regulation B and HMDA duties are separate and depend on applicability, coverage, and application channel. Configure observation, recording, reporting, and retention processes only after compliance review.
- “Funded” is a workflow demonstration only; it does not initiate or verify a payment.

## Intake sections represented

1. Borrower information, current/former residence, and a single employment record.
2. Financial information: simplified assets and liabilities.
3. Financial information: a single other-real-estate record.
4. Loan and property information.
5. Declarations with a required Yes/No response and explanatory details for Yes answers.
6. Acknowledgments and agreements (demo checkboxes only).
7. Military service.
8. Optional demographic information.
9. Loan originator information, plus a limited lender-use workflow area.

## Official references

- [Fannie Mae — Uniform Residential Loan Application (Form 1003)](https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-residential-loan-application)
- [Freddie Mac Seller/Servicer Guide § 5101.1 — Uniform Residential Loan Application](https://guide.freddiemac.com/app/guide/section/5101.1)
- [CFPB Regulation B § 1002.13 — Information for monitoring purposes](https://www.consumerfinance.gov/rules-policy/regulations/1002/13/)
- [CFPB Regulation B § 1002.5 — Rules concerning requests for information](https://www.consumerfinance.gov/rules-policy/regulations/1002/5/)
- [CFPB Regulation C § 1003.4 — Compilation of reportable data](https://www.consumerfinance.gov/rules-policy/regulations/1003/4/)

The redesigned URLA is marked 01/2021. Confirm current GSE forms, implementation instructions, applicable regulations, state requirements, and lender policies with qualified mortgage compliance counsel before production use.
