-- Seed basis data
insert into public.quiz_teams (id, name, score)
values
  (1, 'Team Links', 0),
  (2, 'Team Rechts', 0)
on conflict (id) do update set name=excluded.name, score=excluded.score;

insert into public.quiz_state (id, active_category, active_question_id, show_answer)
values (1, null, null, false)
on conflict (id) do update set active_category=excluded.active_category,
                              active_question_id=excluded.active_question_id,
                              show_answer=excluded.show_answer;
