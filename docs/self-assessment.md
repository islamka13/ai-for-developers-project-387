# Самооценка проекта

Проверка по критериям наставника (Шаг 6). Состояние: `main`, head `c9f425483e44ab79ea77f849fcb7f8bb693790f2`, проверено 2026-11-22.

## Функциональность

| Критерий | Факт |
| --- | --- |
| Приложение перенесено, автопроверка зелёная | [hexlet-check run 44950653255](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44950653255) — `success` на текущем head `main`. |
| Образ собирается, стартует сам, слушает `PORT` | `Dockerfile`: `ENV PORT=3000`, `EXPOSE 3000`, `CMD ["node", "server/src/index.ts"]`. |
| Рабочая ссылка в README | [https://booking-service-wdcu.onrender.com](https://booking-service-wdcu.onrender.com) — проверено, `HTTP 200`. |

## Проверяемость

| Критерий | Факт |
| --- | --- |
| Тесты и линтер в Actions зелёные | [CI run 44950653280](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44950653280) — `success` на head `main`; локально `mise run check` → exit 0. |
| Conventional Commits | Коммиты демонстрационного цикла: `feat:`, `fix:`, `chore:`, `docs:`; например `2f6dd8f feat: регулярный аудит страницы по расписанию (#12)`. |
| release-please обновляет release-PR | [PR #2](https://github.com/islamka13/ai-for-developers-project-387/pull/2) открыт, в `CHANGELOG.md` PR есть пункты `9259a50` и `2f6dd8f`; последний [Release Please run 44950653311](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44950653311) — `success`. |
| Ключ модели только в Secrets | В репозитории только ссылки `${{ secrets.OPENCODE_API_KEY }}` в трёх воркфлоу; значения ключа в Git нет. |
| README описывает воркфлоу, модель, прогоны | Разделы «Агент в GitHub Actions», «Независимое авторевью», «Браузерная проверка», «Регулярный аудит по расписанию»; модель `opencode/big-pickle`, `share: true`, ссылки на Actions. |
| Спецификация и тикеты, согласование человеком | [#5](https://github.com/islamka13/ai-for-developers-project-387/issues/5) → [#6](https://github.com/islamka13/ai-for-developers-project-387/issues/6) → [#7](https://github.com/islamka13/ai-for-developers-project-387/issues/7), [#8](https://github.com/islamka13/ai-for-developers-project-387/issues/8); [согласование](https://github.com/islamka13/ai-for-developers-project-387/issues/5#issuecomment-7067635059) до реализации; реализация выполнена через `implement-spec`. |
| Браузерный артефакт точного SHA PR | [run 44945769965](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44945769965), [артефакт 14723551142](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44945769965/artifacts/14723551142): `head_sha=5070fec…`, `actual_sha=5070fec…`, `exit_code=0`, `pr_number=11`, `trace.zip`. |
| Лимит запусков на PR до вызова модели | [run 44945736707](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44945736707): `attempt 5/3`, `Run OpenCode → skipped`, причина `limit_exhausted`, [комментарий](https://github.com/islamka13/ai-for-developers-project-387/pull/11#issuecomment-7068681371) с SHA и ссылкой на логи. |
| Основной и негативный сценарии в CI | Тесты на 200 символов, отказ >200 с `details.topic` и свободным слотом, конфликт 409 в [PR #11](https://github.com/islamka13/ai-for-developers-project-387/pull/11); там же описаны циклы red→green и регрессионный тест `73b38ac`, который падал на откате обработчика. |
| Связанное описание PR и решение человека | [PR #11](https://github.com/islamka13/ai-for-developers-project-387/pull/11) от `app/opencode-agent`: issue #5, spec #6, тикеты #7/#8, согласование, проверки, риск, откат; мерж выполнил `islamka13`. |
| Критерии ревью и разбор замечаний | `REVIEW.md`, spec #6, тикеты и согласование передаются в prompt [opencode-review.yml](https://github.com/islamka13/ai-for-developers-project-387/blob/main/.github/workflows/opencode-review.yml); [ревью run 44945599100](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44945599100) — `success`. Два замечания разобраны: одно отклонено с объяснением, другое превратилось в регрессионный тест `73b38ac`. |

## Настройка агентной разработки

| Критерий | Факт |
| --- | --- |
| Агент подключён и реально работает | Ответы `opencode-agent[bot]` в issue #5/#12 и PR от `app/opencode-agent` — [#11](https://github.com/islamka13/ai-for-developers-project-387/pull/11). |
| Интерактивный вызов | [opencode.yml](https://github.com/islamka13/ai-for-developers-project-387/blob/main/.github/workflows/opencode.yml): `issue_comment` и `pull_request_review_comment` с `types: [created]`, команды `/opencode,/oc`. |
| Автотриаж и авторевью | Тот же файл: job `triage` на `issues` с инструкцией из `.agents/skills/triage/`; `opencode-review.yml` на `pull_request` с критериями из `REVIEW.md`. |
| Расписание | [audit-schedule.yml](https://github.com/islamka13/ai-for-developers-project-387/blob/main/.github/workflows/audit-schedule.yml): `schedule` `17 6 * * *` + `timezone: Europe/Moscow` и `workflow_dispatch` с `prompt`, частота раз в сутки. |
| Права, тайм-ауты, параллельность | `contents: read`/`issues: write` у аудита без OIDC; `timeout-minutes` 45/10/10/30; `concurrency` во всех агентских воркфлоу, у аудита и ручного вызова `cancel-in-progress: false`. |
| Доверенные авторы и fork | Комментарии принимаются только от `OWNER`/`MEMBER`/`COLLABORATOR`, не от ботов; PR из fork не получают секрет модели. |
| README: mentions и share | Команды `/oc`, `/opencode` и решение `share: true` описаны в разделе «Агент в GitHub Actions». |
| Настройки Мэтта Покока | `docs/agents/domain.md`, `issue-tracker.md`, `triage-labels.md` сохранены; скиллы доступны агенту на раннере. |

## Следы работы в GitHub

- Прогоны и ответы агента видны в [Actions](https://github.com/islamka13/ai-for-developers-project-387/actions) и в обсуждениях [#5](https://github.com/islamka13/ai-for-developers-project-387/issues/5), [#12](https://github.com/islamka13/ai-for-developers-project-387/issues/12), [#11](https://github.com/islamka13/ai-for-developers-project-387/pull/11).
- В PR #11 есть правки после общего комментария ([7068435766](https://github.com/islamka13/ai-for-developers-project-387/pull/11#issuecomment-7068435766) → [7068465649](https://github.com/islamka13/ai-for-developers-project-387/pull/11#issuecomment-7068465649)) и после комментария к строке diff (регрессионный тест в [7068558269](https://github.com/islamka13/ai-for-developers-project-387/pull/11#issuecomment-7068558269)).
- Регулярный аудит: [run 44949529704](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44949529704) с отчётом и выводом, повтор [44949985386](https://github.com/islamka13/ai-for-developers-project-387/actions/runs/44949985386) не создал дубли; issue [#13](https://github.com/islamka13/ai-for-developers-project-387/issues/13), [#14](https://github.com/islamka13/ai-for-developers-project-387/issues/14), [#15](https://github.com/islamka13/ai-for-developers-project-387/issues/15). Отчёты в `audit-data/` игнорируются Git.
- Личные выводы о фактической работе агента — в [README.md](../README.md#выводы-о-работе-агента).

## Итог

Все обязательные критерии Шага 6 подтверждены фактами в репозитории и GitHub. Оставшиеся направления развития (различение повторной проблемы и отсутствия данных, отдельные команды вызова, внешние источники данных, кастомные агенты) описаны в конце условия шага и в задачу не входят.
