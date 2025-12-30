-- Reset / nieuw spel
truncate table public.quiz_questions;

update public.quiz_teams set score = 0;

update public.quiz_state
set active_category = null,
    active_question_id = null,
    show_answer = false
where id = 1;
