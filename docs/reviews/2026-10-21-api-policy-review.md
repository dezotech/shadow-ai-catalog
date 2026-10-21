# OpenAI and Groq policy review — 2026-10-21

This review supports the OpenAI/Groq API-host mappings and their `verifiedAt`
dates. Dates record this review, not a source page's publication/effective date.
Other providers retain their existing verification dates.

## OpenAI

- [Model improvement](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance): individual-plan content may be used for training with opt-out controls; API inputs/outputs are not used by default.
- [Chat retention](https://help.openai.com/en/articles/8983778-chat-and-file-retention-in-chatgpt): chats persist until deleted; deleted chats are scheduled for deletion within 30 days, except content already de-identified and disassociated from the account or retained for legal/security obligations. Temporary Chats may be kept up to 30 days for safety, subject to legal holds.
- [Historical legal hold](https://openai.com/index/response-to-nyt-data-demands/): the broad order ended in September 2025; limited historical April–September 2025 data remains separately held. Preserve this qualification in consumer retention.
- [API data controls](https://developers.openai.com/api/docs/guides/your-data): distinguish abuse-monitoring logs from endpoint-specific application state. ZDR needs approval and has feature/endpoint limitations; BAA availability does not imply ZDR or signed coverage.
- [API BAA availability](https://help.openai.com/en/articles/8660679-getting-a-business-associate-agreement-for-the-openai-api): eligibility and acceptance are required. Special sales-managed/clinical ChatGPT arrangements cannot be inferred from a shared web hostname.

## Groq

- [Customer data](https://console.groq.com/docs/your-data): inference inputs/outputs are not retained by default. Batch, fine-tuning and reliability/abuse monitoring have different retention; ZDR settings disable retention-dependent features.
- [Services Agreement](https://console.groq.com/docs/legal/services-agreement): customer-data use is restricted and training requires customer permission/instruction.
- [BAA](https://console.groq.com/docs/legal/customer-business-associate-addendum): requires an existing agreement and acceptance; free/beta services are excluded. Availability is not proof of customer coverage.
- [Privacy policy](https://groq.com/privacy-policy): account information is retained as necessary for stated purposes and legal requirements, without a universal 30-day deletion promise.

The enterprise label selects the curated API-policy scope. Neither hostname
observations nor this informational catalog prove a customer's contract,
settings, feature use, residency or regulatory compliance. Shared web hosts and
unmapped hosts retain conservative defaults; unknown fields remain unknown.
