# Project Guardrail Agent

[![Apache 2.0 license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

[Atlassian's Work breakdown structure (WBS): Definition and step-by-step guide](https://www.atlassian.com/work-management/project-management/work-breakdown-structure) explains:
> A well-crafted WBS is your roadmap to success, 
> breaking down projects into manageable pieces 
> to ensure you assign tasks efficiently
> and don’t miss deadlines.

And further:
> The WBS clearly outlines each task 
> to help assign responsibilities. 
> Each work package has enough detail 
> to accurately predict resource requirements and durations, 
> aiding in estimating costs and timeframes.

Although "bad project plans" will always have elements of subjectivity,
this Forge-based Rovo Agent captures some common project planning problems
that emerge from having a complex work breakdown structure
in the form of an AI Agent.
The Agent will read a Jira project,
understand the work breakdown structure as a hierarchy,
and analyze key metadata for tasks
(such as summaries, dates, dependencies, and assignments)
to help people make coherent changes to their plans.

You can install it directly using
[this link]().
Once installed you can use it directly as a Forge Agent,
or you can make your own project rules leveraging
the "Fetch Project details" [Action](https://support.atlassian.com/rovo/docs/agent-actions/).
You can learn from it directly by reading
the [agent instructions](./prompts/agent-instructions.md) (ie the prompt).
You can explore interactively with "no code".
Just copy/paste those instructions into [Rovo Agent instructions](https://support.atlassian.com/rovo/docs/write-instructions-for-your-agent/)
(Note: these Agent Instructions use the "Forge Project details" Action,
which structures the work in context).
You can explore as a "pro code" project by forking,
and modifying the prompt and code-based actions.

- **Rovo**. If you're new to Rovo,
[check out how it helps teams quickly discover knowledge across Atlassian and third-party SaaS apps with less time and effort.](https://www.atlassian.com/software/rovo)
- **Atlassian Forge**. If this is your first Forge app,
[try a simple "hello world" app first](https://go.atlassian.com/forge)

Questions?
Join the Rovo conversation in
[the Atlassian user community](https://community.atlassian.com/t5/Rovo/ct-p/rovo-atlassian-intelligence),
or the Forge conversation in
[the Atlassian developer community](https://community.developer.atlassian.com/c/rovo/138).

## Contributions

Contributions to the Forge Rovo Project Guardrail Agent repo are welcome!
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Copyright (c) 2025 Atlassian US., Inc.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks-light.png)](https://www.atlassian.com)
