--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: takes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.takes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    content text NOT NULL,
    prompt_date date DEFAULT CURRENT_DATE NOT NULL,
    is_anonymous boolean DEFAULT false,
    is_late_submit boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT content_length CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(content) <= 2000)))
);


ALTER TABLE public.takes OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    take_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    is_anonymous boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT content_length CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(content) <= 1000)))
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: daily_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_text text NOT NULL,
    prompt_date date NOT NULL,
    category text DEFAULT 'general'::text,
    source text DEFAULT 'ai'::text,
    source_user_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    engagement_score integer DEFAULT 0,
    CONSTRAINT prompt_text_length CHECK ((char_length(TRIM(BOTH FROM prompt_text)) >= 10)),
    CONSTRAINT valid_category CHECK ((category = ANY (ARRAY['general'::text, 'controversial'::text, 'personal'::text, 'creative'::text, 'philosophical'::text, 'hypothetical'::text]))),
    CONSTRAINT valid_source CHECK ((source = ANY (ARRAY['ai'::text, 'admin'::text, 'user_recommendation'::text, 'manual'::text])))
);


ALTER TABLE public.daily_prompts OWNER TO postgres;

--
-- Name: take_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.take_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    take_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_reaction_type CHECK ((reaction_type = ANY (ARRAY['wildTake'::text, 'fairPoint'::text, 'mid'::text, 'thatYou'::text])))
);


ALTER TABLE public.take_reactions OWNER TO postgres;

--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, take_id, user_id, parent_comment_id, content, is_anonymous, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
1407a709-3baf-4cb2-804c-981a2d8f2ed5	638b0609-a5a3-4e98-a361-46313ef8c9d5	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	kjh\n	f	f	2025-06-24 03:35:57.376539+00	2025-06-24 03:35:57.376539+00	\N
8aa5ca93-b6b8-413c-8471-e525a51338bb	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	yes	t	f	2025-09-04 07:29:47.38207+00	2025-09-04 07:29:47.38207+00	\N
005be8da-9aeb-4588-8cec-4d7a32ce430e	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	8aa5ca93-b6b8-413c-8471-e525a51338bb	sure	f	f	2025-09-04 09:11:36.538717+00	2025-09-04 09:11:36.538717+00	\N
f80e71dd-3ee6-4d3e-b918-4a941fdf8727	bd0a795c-d494-482b-ade3-929be30a93c3	de59f6c2-1243-4358-b4ce-043f106a4b3c	005be8da-9aeb-4588-8cec-4d7a32ce430e	love you	f	f	2025-09-04 09:59:41.338083+00	2025-09-04 09:59:41.338083+00	\N
6d9e4cb2-f9e8-45f6-81ea-58bb399973e1	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	hi	f	f	2025-09-04 10:13:38.276696+00	2025-09-04 10:13:38.276696+00	\N
822f4f69-fb60-43af-a1a4-ba62b333fea8	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	005be8da-9aeb-4588-8cec-4d7a32ce430e	no	f	f	2025-09-04 10:53:02.003155+00	2025-09-04 10:53:02.003155+00	\N
d77a508c-1820-4448-a35f-a4be54b832f5	bd0a795c-d494-482b-ade3-929be30a93c3	25e70717-9e94-40af-9a4c-07f918d6da46	\N	my answer was far superior\n	f	f	2025-09-04 18:05:30.058293+00	2025-09-04 18:05:30.058293+00	\N
fa15a967-360f-495a-ab6b-c3b6f5687c20	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	ahhhh ! impeccable 	f	f	2025-09-04 18:13:17.300494+00	2025-09-04 18:13:17.300494+00	\N
a5b6d9db-b316-4175-9e8a-12c5e05f7573	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	hi	f	f	2025-09-05 00:08:25.326514+00	2025-09-05 00:08:25.326514+00	\N
64dab4e4-8b1a-4080-adfb-c4f325e210a2	17362a88-7ade-46fc-86b7-56a6232f35c8	25e70717-9e94-40af-9a4c-07f918d6da46	\N	you wilin 	f	f	2025-09-05 21:42:02.249116+00	2025-09-05 21:42:02.249116+00	\N
f789a02b-0494-474a-a448-65f772278b56	abe79aa8-51e9-484e-8b6f-a68aee954bd2	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	That’s so profound 	f	f	2025-09-05 21:44:24.107149+00	2025-09-05 21:44:24.107149+00	\N
d5412454-4285-4b23-a6f0-7b8c148bc57f	abe79aa8-51e9-484e-8b6f-a68aee954bd2	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	Isn’t it 	t	f	2025-09-05 21:47:30.187144+00	2025-09-05 21:47:30.187144+00	\N
b2c8c7c3-e9dd-4a5a-9f11-a0d7e3187997	019b18ad-6fdb-4a31-a57d-7281d47b4cae	896f013a-fef5-44b1-a1a8-3707d8a5e332	\N	Hello 	f	f	2025-09-06 20:26:43.490507+00	2025-09-06 20:26:43.490507+00	\N
\.


--
-- Data for Name: daily_prompts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_prompts (id, prompt_text, prompt_date, category, source, source_user_id, is_active, created_at, engagement_score) FROM stdin;
47cbc105-9bf4-423d-9d9f-4cf25389755b	What's one small change that could make the world significantly better?	2025-06-14	general	admin	\N	t	2025-06-14 02:21:20.660848+00	0
0635a9ac-d921-469d-87ba-afe1b28bbd9e	What's your most controversial opinion that you're willing to defend?	2025-06-13	controversial	admin	\N	t	2025-06-14 02:21:20.660848+00	0
cff20a93-d3ef-4558-b494-87931cac5777	Describe your ideal day in exactly 50 words	2025-06-12	creative	admin	\N	t	2025-06-14 02:21:20.660848+00	0
bef0a159-a24e-471a-b2aa-5c758284babe	What lesson did you learn the hard way?	2025-06-11	personal	admin	\N	t	2025-06-14 02:21:20.660848+00	0
ef3709fb-9d49-4738-bcf6-c95ec4a2e194	If you could have dinner with anyone, living or dead, who would it be and why?	2025-06-10	hypothetical	admin	\N	t	2025-06-14 02:21:20.660848+00	0
97960622-43cc-4c7a-8d43-7f09d8d083cd	What does success mean to you?	2025-06-09	philosophical	admin	\N	t	2025-06-14 02:21:20.660848+00	0
927d9125-47de-47a6-91b7-d684750bf60c	Which widely accepted practice should be questioned?	2025-06-08	controversial	admin	\N	t	2025-06-14 02:21:20.660848+00	0
e79efe9e-2e43-4caa-a038-91ffdaccdab2	What's something you're proud of but rarely talk about?	2025-06-15	personal	admin	\N	t	2025-06-14 02:21:20.660848+00	0
79a2d180-6b13-4f66-9a25-939658696f5d	If you could redesign one thing in the world, what would it be?	2025-06-16	creative	admin	\N	t	2025-06-14 02:21:20.660848+00	0
2b8551ce-f9fc-48da-9d93-79dce4d0839c	What's the most important question we should be asking?	2025-06-17	philosophical	admin	\N	t	2025-06-14 02:21:20.660848+00	0
7abd1e57-5cec-4cf2-83ca-16b832095ba8	What is your boldest prediction for the rest of 2025?	2025-06-18	general	admin	\N	t	2025-06-18 17:48:17.90977+00	0
64aba149-2ac6-4929-a5d2-f19ad1ba5a60	What is one thing you would take with you on a deserted island	2025-06-23	general	ai	\N	t	2025-06-23 18:06:39.831041+00	0
7b156c48-d6cd-4ac9-abe6-14c6df978130	What's an opinion you're scared to share?	2025-09-02	controversial	admin	\N	t	2025-09-02 20:31:07.334462+00	0
b749629e-5f4d-449c-b8cf-c2e8202eb61e	What's the pettiest thing you've ever done?	2025-09-03	personal	admin	\N	t	2025-09-02 20:31:07.334462+00	0
8ee3b8b9-7fc5-4b67-a9c9-fd3593a5c018	What's a hill you'll die on?	2025-09-04	philosophical	admin	\N	t	2025-09-02 20:31:07.334462+00	0
7e11f912-33fb-4d81-a05c-43a83f12aafc	What's something you believe that most people disagree with?	2025-09-05	controversial	admin	\N	t	2025-09-02 20:31:07.334462+00	0
c12ba861-1dbf-43dd-9c53-4efc18be1250	What's the most embarrassing thing that happened to you this week?	2025-09-06	personal	admin	\N	t	2025-09-02 20:31:07.334462+00	0
707d7a1b-77b8-4f5d-b32d-c4633ae3cb2c	Is it ever okay to lie in a relationship?	2025-09-11	general	ai	\N	t	2025-09-04 10:45:56.72899+00	0
bd7cbfa5-a636-4d8b-a74a-662e0d9d9d29	Should pineapple be allowed on pizza?	2025-09-01	general	ai	\N	t	2025-09-04 10:59:26.224972+00	0
c83964ab-db84-4e5b-a411-df54bdd6aec5	What is the most overrated trend or fad right now?	2025-08-31	general	ai	\N	t	2025-09-04 18:13:58.63399+00	0
22815d3c-6603-45a7-bd20-cc3ff209fbab	What's the worst piece of advice you've ever received?	2025-08-30	general	ai	\N	t	2025-09-04 22:54:18.499869+00	0
bdcf8aee-05a3-413a-afe4-081310145d36	Is cancel culture effective in holding people accountable or does it stifle necessary conversations and growth?	2025-09-07	general	ai	\N	t	2025-09-06 03:10:26.771387+00	0
01f102fa-cbf2-46fe-8dee-ed55372fac02	What is the one thing you would change about society if you had the power to do so?	2025-09-08	general	ai	\N	t	2025-09-06 03:10:50.310458+00	0
3a58dbed-a1b1-4a6c-8ade-f793b1f4279d	What is the one thing you would change about yourself if you had the chance, and why?	2025-09-09	general	ai	\N	t	2025-09-06 03:11:29.487248+00	0
67cdb3e7-b6c9-4c50-8b93-98e32166940d	Pitch a movie that shouldn’t work but somehow does.	2025-09-15	general	ai	\N	t	2025-09-15 23:29:34.53391+00	0
978b9725-0033-4a74-a186-7679427f8ee7	Kill one beloved feature tomorrow—what and why?	2025-09-16	general	ai	\N	t	2025-09-15 23:29:34.580608+00	0
0b6b69de-e868-44a4-b938-87a1e7799007	Name a “common sense” rule we should break more often—and defend it.	2025-09-17	general	ai	\N	t	2025-09-15 23:29:34.64086+00	0
7af1f54e-34b9-43b6-8ccd-74feff3fe1e1	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-09-18	general	ai	\N	t	2025-09-15 23:29:34.691668+00	0
4a9932cf-9d22-4fd5-b566-3df26cb80895	Drop a food take that always starts a fight—and defend it.	2025-09-19	general	ai	\N	t	2025-09-15 23:29:34.751992+00	0
f28df3c1-660c-4a9c-808c-b510d54d6c14	Which Instagram feature would you remove today, and what improves?	2025-09-20	general	ai	\N	t	2025-09-15 23:29:34.883655+00	0
abfca4a9-4f72-48aa-bb41-4deb2b957245	Unpopular opinion: VR headsets are overrated. Convince us.	2025-09-21	general	ai	\N	t	2025-09-15 23:29:34.978375+00	0
ad2af3af-3704-420e-9b82-353a4220160e	Fix X with one bold change.	2025-09-22	general	ai	\N	t	2025-09-15 23:29:35.032024+00	0
57d8558b-4ed2-44a0-ba55-4bad6469332c	Make a 2026 prediction you’d bet your own money on.	2025-09-23	general	ai	\N	t	2025-09-15 23:29:35.076936+00	0
175d8170-443b-4a2e-b331-0c3dcd15e7d7	What’s the last “upgrade” in tech that made things worse?	2025-09-24	general	ai	\N	t	2025-09-15 23:29:35.124014+00	0
a07ca711-2dcf-4d2a-81a0-2c87471ac247	What should NHL copy from Premier League—and why?	2025-09-25	general	ai	\N	t	2025-09-15 23:29:35.167552+00	0
b4cf9325-aee2-464c-ae52-54c9014159b0	Call out a cultural habit we pretend to like but don’t—and why.	2025-09-26	general	ai	\N	t	2025-09-15 23:29:35.267568+00	0
0d622c8a-90f6-4084-8819-63e56f680bb6	Ban one buzzword forever. Which one and why?	2025-09-27	general	ai	\N	t	2025-09-15 23:29:35.427602+00	0
0f514db9-f100-441e-8e73-f3fd09da4110	Choose a feature to steal from Instagram and put into X.	2025-09-28	general	ai	\N	t	2025-09-15 23:29:35.505824+00	0
15ab48ff-6351-467f-942a-06de311002b2	Which autoplay should never have shipped? Explain.	2025-09-29	general	ai	\N	t	2025-09-15 23:29:35.551766+00	0
9eb9a4e7-433b-4af3-9bc0-a525e0d6d815	A franchise that needs to end—now. Which one and why?	2025-09-30	general	ai	\N	t	2025-09-15 23:29:35.5931+00	0
d81ad7ad-dee1-4344-9e89-2f22f62e513a	Say one nice thing about something you usually dislike.	2025-10-01	general	ai	\N	t	2025-09-15 23:29:35.632909+00	0
8695c8d7-fd65-48e5-a565-5b41fab70a5d	Defend a take you’ll probably get roasted for.	2025-10-02	general	ai	\N	t	2025-09-15 23:29:35.676412+00	0
5262e9cf-e723-4db6-a402-6662febe5a13	What’s a “beloved classic” that doesn’t hold up?	2025-10-03	general	ai	\N	t	2025-09-15 23:29:35.720036+00	0
7ea2e8b3-0184-43a5-b056-7df9f63ab306	Replace a daily habit with a weirder one that works better.	2025-10-04	general	ai	\N	t	2025-09-15 23:29:35.760488+00	0
69af785e-1544-4c61-bee6-c55cabaabdfe	Pitch a movie that shouldn’t work but somehow does.	2025-10-05	general	ai	\N	t	2025-09-15 23:29:35.802374+00	0
35b5ea3e-d844-4d29-977f-738d31cfd1b8	Kill one beloved feature tomorrow—what and why?	2025-10-06	general	ai	\N	t	2025-09-15 23:29:35.934018+00	0
c5819268-b6d6-48fb-9968-cc13bcc8a7e0	Name a “common sense” rule we should break more often—and defend it.	2025-10-07	general	ai	\N	t	2025-09-15 23:29:35.979381+00	0
c540bc2a-ee9a-4153-93c2-8baf9ba4e654	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-10-08	general	ai	\N	t	2025-09-15 23:29:36.039918+00	0
e9b2f391-30a7-444c-b9bc-9439267bc10e	Drop a food take that always starts a fight—and defend it.	2025-10-09	general	ai	\N	t	2025-09-15 23:29:36.083248+00	0
562dd45d-3f95-4f97-806d-456bdec76092	Which Spotify feature would you remove today, and what improves?	2025-10-10	general	ai	\N	t	2025-09-15 23:29:36.129605+00	0
4244b163-b4e4-41b8-8684-c27b922a7d2d	Unpopular opinion: AI assistants are overrated. Convince us.	2025-10-11	general	ai	\N	t	2025-09-15 23:29:36.187623+00	0
6a55a722-4399-4b91-be49-10714a721f94	Fix YouTube with one bold change.	2025-10-12	general	ai	\N	t	2025-09-15 23:29:36.230075+00	0
deb29149-3552-425c-8c42-314e6b4a3234	Make a 2026 prediction you’d bet your own money on.	2025-10-13	general	ai	\N	t	2025-09-15 23:29:36.291717+00	0
c42653e7-4928-40df-add1-f36dfea5c403	What’s the last “upgrade” in tech that made things worse?	2025-10-14	general	ai	\N	t	2025-09-15 23:29:36.342605+00	0
e3080c4e-988d-46f4-914c-3a413d3edbe9	What should NFL copy from UFC—and why?	2025-10-15	general	ai	\N	t	2025-09-15 23:29:36.466145+00	0
02f2e2d2-d2a1-4f71-ae8f-2b28ab61c1b5	Ban one buzzword forever. Which one and why?	2025-10-17	general	ai	\N	t	2025-09-15 23:29:36.550203+00	0
864f2121-c767-4bf7-b28e-d6dee24c9d86	Choose a feature to steal from Snapchat and put into Snapchat.	2025-10-18	general	ai	\N	t	2025-09-15 23:29:36.597299+00	0
735407ab-9580-4a97-95dc-79e1b738aaf8	Which notification badges should never have shipped? Explain.	2025-10-19	general	ai	\N	t	2025-09-15 23:29:36.642853+00	0
363336d8-b519-409a-add6-da408a2d1b48	A franchise that needs to end—now. Which one and why?	2025-10-20	general	ai	\N	t	2025-09-15 23:29:36.687947+00	0
40355960-ca62-434e-9455-365a0c6cfaac	Say one nice thing about something you usually dislike.	2025-10-21	general	ai	\N	t	2025-09-15 23:29:36.733148+00	0
2bba7c52-b289-4f0c-a94f-e2b4bde590c6	Defend a take you’ll probably get roasted for.	2025-10-22	general	ai	\N	t	2025-09-15 23:29:36.78406+00	0
e057274b-e55f-472c-a521-04728a9eefe3	What’s a “beloved classic” that doesn’t hold up?	2025-10-23	general	ai	\N	t	2025-09-15 23:29:36.826218+00	0
24041291-308f-4aed-b067-219f5a3e9018	Replace a daily habit with a weirder one that works better.	2025-10-24	general	ai	\N	t	2025-09-15 23:29:36.9649+00	0
a3546df5-2212-488c-93eb-7f294f11e90b	Pitch a movie that shouldn’t work but somehow does.	2025-10-25	general	ai	\N	t	2025-09-15 23:29:37.004914+00	0
02763b0e-c703-40aa-b523-1d042b3b9bd1	Kill one beloved feature tomorrow—what and why?	2025-10-26	general	ai	\N	t	2025-09-15 23:29:37.048101+00	0
148955a3-2ac4-40f9-8d5b-3bb9c50ab501	Name a “common sense” rule we should break more often—and defend it.	2025-10-27	general	ai	\N	t	2025-09-15 23:29:37.089784+00	0
f4dbb7c7-2cb5-4e6a-953a-fa15ea536dc1	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-10-28	general	ai	\N	t	2025-09-15 23:29:37.129719+00	0
be948f27-d5e7-49b2-b74a-71bd72de77e6	Drop a food take that always starts a fight—and defend it.	2025-10-29	general	ai	\N	t	2025-09-15 23:29:37.183144+00	0
968e6e3d-8f5d-4f5b-9a4f-ebcb7e5b2297	Which Spotify feature would you remove today, and what improves?	2025-10-30	general	ai	\N	t	2025-09-15 23:29:37.224942+00	0
1477c1cb-cd02-4bb7-9ee9-1b611e64b11d	Fix LinkedIn with one bold change.	2025-11-01	general	ai	\N	t	2025-09-15 23:29:37.310066+00	0
29fa356f-4fb0-489f-819c-b9cbc48ec92f	Make a 2026 prediction you’d bet your own money on.	2025-11-02	general	ai	\N	t	2025-09-15 23:29:37.353013+00	0
5a1a244b-9535-4cef-b4ef-9d3078c46529	What’s the last “upgrade” in tech that made things worse?	2025-11-03	general	ai	\N	t	2025-09-15 23:29:37.487392+00	0
8e7311b3-b085-46db-ab90-87a9ecf44491	What should Formula 1 copy from MLS—and why?	2025-11-04	general	ai	\N	t	2025-09-15 23:29:37.528767+00	0
e1ceacd2-b329-4260-90f7-4b216021daef	Call out a cultural habit we pretend to like but don’t—and why.	2025-11-05	general	ai	\N	t	2025-09-15 23:29:37.571308+00	0
f8783f05-a0a0-4e2d-8556-d8a4ad075ce4	Ban one buzzword forever. Which one and why?	2025-11-06	general	ai	\N	t	2025-09-15 23:29:37.614728+00	0
31e8652e-1b23-4cbb-bc4a-ff090ffd2bdd	Choose a feature to steal from BeReal and put into LinkedIn.	2025-11-07	general	ai	\N	t	2025-09-15 23:29:37.658497+00	0
1d9b22ce-01c4-4ff5-a5dc-211358fbc5f1	Which infinite scroll should never have shipped? Explain.	2025-11-08	general	ai	\N	t	2025-09-15 23:29:37.704216+00	0
c2d944a2-2f84-4df6-b3e4-570a98a893e3	A franchise that needs to end—now. Which one and why?	2025-11-09	general	ai	\N	t	2025-09-15 23:29:37.746956+00	0
6c2cf560-9ba9-4641-b4e0-2553537db60e	Say one nice thing about something you usually dislike.	2025-11-10	general	ai	\N	t	2025-09-15 23:29:37.786877+00	0
e9177402-3775-4de1-873f-7dbbbee14536	Defend a take you’ll probably get roasted for.	2025-11-11	general	ai	\N	t	2025-09-15 23:29:37.827226+00	0
d386a386-51ad-48b7-b3f5-ac32b35e49d2	What’s a “beloved classic” that doesn’t hold up?	2025-11-12	general	ai	\N	t	2025-09-15 23:29:37.867814+00	0
f6061000-12a3-4ba8-944b-e06cb3ceb774	Replace a daily habit with a weirder one that works better.	2025-11-13	general	ai	\N	t	2025-09-15 23:29:37.908261+00	0
6c43d12a-b3a6-4f3d-9a51-8becde27e4dd	Pitch a movie that shouldn’t work but somehow does.	2025-11-14	general	ai	\N	t	2025-09-15 23:29:38.119843+00	0
a7162849-a52f-43e4-b766-61227a7e190c	Kill one beloved feature tomorrow—what and why?	2025-11-15	general	ai	\N	t	2025-09-15 23:29:38.160254+00	0
acf87a6c-682d-4bb7-851e-b8ff7de849a7	Name a “common sense” rule we should break more often—and defend it.	2025-11-16	general	ai	\N	t	2025-09-15 23:29:38.204564+00	0
31fe0bae-3c81-46b7-8d90-40e7be293d6c	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-11-17	general	ai	\N	t	2025-09-15 23:29:38.242923+00	0
6ab47660-4328-4fc3-98d7-044ebf329f81	Drop a food take that always starts a fight—and defend it.	2025-11-18	general	ai	\N	t	2025-09-15 23:29:38.284347+00	0
0dd0253f-8ba2-4678-9ff2-70803f09094c	Which Reddit feature would you remove today, and what improves?	2025-11-19	general	ai	\N	t	2025-09-15 23:29:38.328574+00	0
a198b5d9-e6ec-4004-9712-22b7449fee24	Unpopular opinion: AI assistants are overrated. Convince us.	2025-11-20	general	ai	\N	t	2025-09-15 23:29:38.379695+00	0
f208b628-989b-4535-b603-92a59fb46743	Fix Spotify with one bold change.	2025-11-21	general	ai	\N	t	2025-09-15 23:29:38.425909+00	0
ed41984a-37a2-4191-8f31-9a59c039ef6f	Make a 2026 prediction you’d bet your own money on.	2025-11-22	general	ai	\N	t	2025-09-15 23:29:38.549498+00	0
383c1abc-7533-4a42-bfe9-c39d3b90a530	What’s the last “upgrade” in tech that made things worse?	2025-11-23	general	ai	\N	t	2025-09-15 23:29:38.588904+00	0
567743d3-fcd7-4398-9385-a5448cd28da6	What should MLB copy from Premier League—and why?	2025-11-24	general	ai	\N	t	2025-09-15 23:29:38.636786+00	0
473be641-4ebd-49a3-a116-725fce279c23	Call out a cultural habit we pretend to like but don’t—and why.	2025-11-25	general	ai	\N	t	2025-09-15 23:29:38.678243+00	0
9c3e62d4-8bb5-4586-adc2-1c197a4547f2	Ban one buzzword forever. Which one and why?	2025-11-26	general	ai	\N	t	2025-09-15 23:29:38.716427+00	0
b21c18a4-c7d1-402e-9f8d-1acd5c721d3f	A franchise that needs to end—now. Which one and why?	2025-11-29	general	ai	\N	t	2025-09-15 23:29:38.845693+00	0
cb7236a6-7b2b-4e5d-8906-01607ab99973	Say one nice thing about something you usually dislike.	2025-11-30	general	ai	\N	t	2025-09-15 23:29:39.053655+00	0
f8a3f21a-1ebc-4f24-9110-9cec60f653d0	What’s a “beloved classic” that doesn’t hold up?	2025-12-02	general	ai	\N	t	2025-09-15 23:29:39.134171+00	0
31009677-6b2f-405b-9c52-b482e2ea0cdd	Replace a daily habit with a weirder one that works better.	2025-12-03	general	ai	\N	t	2025-09-15 23:29:39.179183+00	0
bf47a88a-c5e1-4bd5-b486-831f7793c7b7	Pitch a movie that shouldn’t work but somehow does.	2025-12-04	general	ai	\N	t	2025-09-15 23:29:39.219127+00	0
e166eef8-d75c-4513-86b2-b1e63e2bdd09	Kill one beloved feature tomorrow—what and why?	2025-12-05	general	ai	\N	t	2025-09-15 23:29:39.267039+00	0
04fa5cb8-9802-4334-bf17-edf8642e7eac	Name a “common sense” rule we should break more often—and defend it.	2025-12-06	general	ai	\N	t	2025-09-15 23:29:39.30713+00	0
e974bde3-9af5-49fa-b88a-caea4e76172a	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-12-07	general	ai	\N	t	2025-09-15 23:29:39.349482+00	0
0269df8e-ace7-4978-97c2-cd7e19b634c7	Drop a food take that always starts a fight—and defend it.	2025-12-08	general	ai	\N	t	2025-09-15 23:29:39.40322+00	0
2e002e65-b62c-4a99-9411-18e66af29113	Which Twitch feature would you remove today, and what improves?	2025-12-09	general	ai	\N	t	2025-09-15 23:29:39.442654+00	0
39de4a43-9086-4bce-8bc7-7dfafbb3109f	Unpopular opinion: wearables are overrated. Convince us.	2025-12-10	general	ai	\N	t	2025-09-15 23:29:39.572054+00	0
c7ea26fb-af06-468e-8e9a-5e9e08343c4d	Fix Reddit with one bold change.	2025-12-11	general	ai	\N	t	2025-09-15 23:29:39.616474+00	0
d1a2db72-d35a-433b-81f2-8583f3911396	Make a 2026 prediction you’d bet your own money on.	2025-12-12	general	ai	\N	t	2025-09-15 23:29:39.661722+00	0
ac14d59d-3634-466c-945c-27f8f505c25c	Which side dish is just a cry for help?	2025-11-27	general	ai	\N	t	2025-09-15 23:29:38.763069+00	0
3a0072fc-ed2c-4c22-ad59-b88ac51969f1	What fake ‘deal’ should get permanently cart‑abandoned?	2025-11-28	general	ai	\N	t	2025-09-15 23:29:38.804899+00	0
5221f58f-abbe-4151-a482-4378ee9e83b2	Name a new tech tool that’s just believable enough to exist.	2025-12-01	general	ai	\N	t	2025-09-15 23:29:39.094607+00	0
a1d6c564-1b6f-4644-92aa-08e0b5ee5b1a	What’s the last “upgrade” in tech that made things worse?	2025-12-13	general	ai	\N	t	2025-09-15 23:29:39.705661+00	0
2b7e45f3-22b9-4510-b1ab-ccfc550b4514	Call out a cultural habit we pretend to like but don’t—and why.	2025-12-15	general	ai	\N	t	2025-09-15 23:29:39.789815+00	0
41672ffb-54bb-40d6-9db3-6da0f99d0862	Ban one buzzword forever. Which one and why?	2025-12-16	general	ai	\N	t	2025-09-15 23:29:39.831759+00	0
53cd7ebf-4d0a-4499-9936-230c072fd939	Choose a feature to steal from YouTube and put into X.	2025-12-17	general	ai	\N	t	2025-09-15 23:29:39.878833+00	0
e6017490-325b-46ad-ad2a-b828e9e6db7a	Which Stories should never have shipped? Explain.	2025-12-18	general	ai	\N	t	2025-09-15 23:29:39.920241+00	0
0996847c-08ab-4d36-8c9e-89be5b9cd30f	A franchise that needs to end—now. Which one and why?	2025-12-19	general	ai	\N	t	2025-09-15 23:29:39.963668+00	0
211b50dc-c34e-4072-bd1b-d446c5a0633c	Say one nice thing about something you usually dislike.	2025-12-20	general	ai	\N	t	2025-09-15 23:29:40.003048+00	0
c4000062-ddb0-4954-981c-2f11a88a42f7	Defend a take you’ll probably get roasted for.	2025-12-21	general	ai	\N	t	2025-09-15 23:29:40.152026+00	0
18a036bc-909d-4ad0-b731-6d880a0ca934	What’s a “beloved classic” that doesn’t hold up?	2025-12-22	general	ai	\N	t	2025-09-15 23:29:40.195545+00	0
faab0c5e-cc99-465b-9fe0-0d7b29355b68	Replace a daily habit with a weirder one that works better.	2025-12-23	general	ai	\N	t	2025-09-15 23:29:40.233112+00	0
2c2a7113-877c-4085-ac8c-23ff3c5a40c6	Name a “common sense” rule we should break more often—and defend it.	2025-12-26	general	ai	\N	t	2025-09-15 23:29:40.36644+00	0
e0bec92e-bd2a-41ad-b3c9-2c3c6801af28	Pick a 2025 trend that will look embarrassing in two years. Why?	2025-12-27	general	ai	\N	t	2025-09-15 23:29:40.406374+00	0
257cedcf-166d-47f4-a335-03a3eb393d82	Drop a food take that always starts a fight—and defend it.	2025-12-28	general	ai	\N	t	2025-09-15 23:29:40.448003+00	0
b354a109-14cd-4120-aa13-fa5eca66d2df	Which Reddit feature would you remove today, and what improves?	2025-12-29	general	ai	\N	t	2025-09-15 23:29:40.490229+00	0
b4d5bc1d-514e-423b-a857-3603c224858b	Unpopular opinion: foldable phones are overrated. Convince us.	2025-12-30	general	ai	\N	t	2025-09-15 23:29:40.531891+00	0
0d4aebd9-118b-4bcc-b238-ca9de0afd7c2	What’s the pettiest boss rule that taught you to stop listening to bosses?	2025-10-16	general	ai	\N	t	2025-09-15 23:29:36.506876+00	0
d1f029d2-55e4-4471-ae13-e93e7dbd9c24	Name a ‘scary’ classic that only works if you’ve never met Wi‑Fi.	2025-10-31	general	ai	\N	t	2025-09-15 23:29:37.268547+00	0
d37d7399-9244-454f-8196-a1ff6cf8aebd	Which tradition got better after we broke the rules?	2025-12-14	general	ai	\N	t	2025-09-15 23:29:39.748081+00	0
6358e203-d681-491a-9a28-da29c541c04b	What holiday ritual is performance art with snacks?	2025-12-24	general	ai	\N	t	2025-09-15 23:29:40.272953+00	0
fa2dd343-5c5a-4f37-8dd6-23a3fbf235c7	Which ‘beloved’ Christmas movie is just a hostage situation with tinsel?	2025-12-25	general	ai	\N	t	2025-09-15 23:29:40.325027+00	0
dff4b771-f71b-447a-9a86-95986dc9b5af	Which resolution trend is multilevel marketing for guilt?	2025-12-31	general	ai	\N	t	2025-09-15 23:29:40.650731+00	0
\.


--
-- Data for Name: take_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.take_reactions (id, take_id, actor_id, reaction_type, created_at) FROM stdin;
6497bc78-a713-4b57-9471-1ceb67ecb967	638b0609-a5a3-4e98-a361-46313ef8c9d5	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-06-24 03:35:48.567+00
344c389d-46f1-4985-8453-86df851df732	638b0609-a5a3-4e98-a361-46313ef8c9d5	896f013a-fef5-44b1-a1a8-3707d8a5e332	mid	2025-06-24 03:35:50.432+00
dff42984-eb4a-43fe-8d41-2fe640cbef28	638b0609-a5a3-4e98-a361-46313ef8c9d5	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-06-24 03:35:51.588+00
335aabd6-1df0-4302-b864-a8eafdf857f7	4ebb39f2-2753-4295-b092-0ad2586f8322	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-02 22:22:12.181+00
62931802-1284-49dc-a148-1fb425c5918e	4ebb39f2-2753-4295-b092-0ad2586f8322	896f013a-fef5-44b1-a1a8-3707d8a5e332	fairPoint	2025-09-02 22:22:15.79+00
d15c011a-3aac-4c23-ae2d-24c85dda4481	4ebb39f2-2753-4295-b092-0ad2586f8322	896f013a-fef5-44b1-a1a8-3707d8a5e332	mid	2025-09-02 22:22:16.52+00
3b731b01-949d-490b-b05b-f654290fd398	4ebb39f2-2753-4295-b092-0ad2586f8322	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-02 22:22:17.071+00
98fe4a51-5ec4-4511-a43e-54d4b6e76c8f	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-04 07:29:37.114+00
b0a816fc-7a61-4609-811e-658101331ab5	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-04 07:40:05.829+00
419b9698-6a58-48d3-8022-275a2ad01b7d	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	mid	2025-09-04 07:40:07.234+00
34da0b18-40fb-4ec4-be68-5e89747c9524	bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	fairPoint	2025-09-04 07:40:08.257+00
6fce5f7d-cc57-47c4-9e5c-9b203a4db63f	bd0a795c-d494-482b-ade3-929be30a93c3	de59f6c2-1243-4358-b4ce-043f106a4b3c	fairPoint	2025-09-04 09:59:41.883+00
abf3b6ec-555c-4229-8b4c-33d8242dccf4	41969e9c-a973-4a79-b8d7-796b60127836	de59f6c2-1243-4358-b4ce-043f106a4b3c	fairPoint	2025-09-04 10:12:54.346+00
5ccb1ea0-0c94-4c42-9032-44e09c43f7c3	bd0a795c-d494-482b-ade3-929be30a93c3	25e70717-9e94-40af-9a4c-07f918d6da46	fairPoint	2025-09-04 18:05:18.966+00
13f3dc7e-8dcb-4fd0-849d-dbd4a96bf5de	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	25e70717-9e94-40af-9a4c-07f918d6da46	wildTake	2025-09-04 18:05:38.399+00
37f5d05b-3ddd-4b88-86e0-35c81f59441f	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	mid	2025-09-04 18:13:29.239+00
f7521d1d-68b5-45c7-87db-f68a29b56594	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-04 19:45:22.97+00
51ce901b-41c1-4aa8-9de7-f215a9e60b4a	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	fairPoint	2025-09-04 20:51:18.235+00
2e93d4cc-56e6-4450-92b8-7cf6bf764430	3b4db3f5-efa0-4188-b8fa-f4f39000aecf	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-04 20:51:19.694+00
a53b92d0-f118-4f52-9f3f-a90a7b7b2055	bd0a795c-d494-482b-ade3-929be30a93c3	25e70717-9e94-40af-9a4c-07f918d6da46	mid	2025-09-04 23:12:57.942+00
72aeb75a-3498-4478-8a49-553e5e3b7598	17362a88-7ade-46fc-86b7-56a6232f35c8	25e70717-9e94-40af-9a4c-07f918d6da46	wildTake	2025-09-05 21:41:53.058+00
5a063603-753c-45f6-a5e9-1cc856da60b0	abe79aa8-51e9-484e-8b6f-a68aee954bd2	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-05 21:47:38.824+00
999c8cbc-42b5-4f30-a85e-96e7f3b6bef5	abe79aa8-51e9-484e-8b6f-a68aee954bd2	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-05 21:47:40.053+00
b5552ba4-048b-4612-8177-89f4835accbd	abe79aa8-51e9-484e-8b6f-a68aee954bd2	896f013a-fef5-44b1-a1a8-3707d8a5e332	fairPoint	2025-09-05 21:47:40.889+00
a115e5fb-9083-4364-827f-122f67bbd289	97f9470b-e96d-4745-a25e-b0bce8f50aa8	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-05 23:01:06.444+00
be40308f-d2ae-4aa2-a747-4b186625a016	17362a88-7ade-46fc-86b7-56a6232f35c8	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-05 23:01:29.726+00
bb1e9958-9ac9-411e-9bff-a346a698b2fe	17362a88-7ade-46fc-86b7-56a6232f35c8	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-05 23:21:49.276+00
a3a33252-4cca-4aad-b851-59a9ce5746b5	73b837cb-fbaa-4e19-a589-41ee8554ca4a	25e70717-9e94-40af-9a4c-07f918d6da46	fairPoint	2025-09-06 18:29:24.141+00
28315bad-2d46-48bf-970c-1bb95ac40767	019b18ad-6fdb-4a31-a57d-7281d47b4cae	896f013a-fef5-44b1-a1a8-3707d8a5e332	thatYou	2025-09-06 20:26:17.689+00
1f46bf5f-ce28-463c-8070-79124591b56f	73b837cb-fbaa-4e19-a589-41ee8554ca4a	896f013a-fef5-44b1-a1a8-3707d8a5e332	wildTake	2025-09-16 00:20:58.591+00
9c3ae002-72cf-47c7-bca0-fbd04d96f0f0	73b837cb-fbaa-4e19-a589-41ee8554ca4a	896f013a-fef5-44b1-a1a8-3707d8a5e332	fairPoint	2025-09-16 00:21:00.89+00
\.


--
-- Data for Name: takes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.takes (id, user_id, prompt_id, content, prompt_date, is_anonymous, is_late_submit, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
bd0a795c-d494-482b-ade3-929be30a93c3	896f013a-fef5-44b1-a1a8-3707d8a5e332	8ee3b8b9-7fc5-4b67-a9c9-fd3593a5c018	a good one	2025-09-04	f	f	f	2025-09-04 07:28:38.700753+00	2025-09-04 07:28:38.700753+00	\N
41969e9c-a973-4a79-b8d7-796b60127836	de59f6c2-1243-4358-b4ce-043f106a4b3c	8ee3b8b9-7fc5-4b67-a9c9-fd3593a5c018	a reallly good one!	2025-09-04	f	f	f	2025-09-04 09:59:29.446182+00	2025-09-04 09:59:29.446182+00	\N
3b4db3f5-efa0-4188-b8fa-f4f39000aecf	25e70717-9e94-40af-9a4c-07f918d6da46	8ee3b8b9-7fc5-4b67-a9c9-fd3593a5c018	Daily sauna use is the most important thing for human health both physically and mentally	2025-09-04	f	f	f	2025-09-04 18:04:18.941983+00	2025-09-04 18:04:18.941983+00	\N
97f9470b-e96d-4745-a25e-b0bce8f50aa8	896f013a-fef5-44b1-a1a8-3707d8a5e332	c83964ab-db84-4e5b-a411-df54bdd6aec5	being nice	2025-08-31	f	f	f	2025-09-04 18:14:14.704258+00	2025-09-04 18:14:14.704258+00	\N
638b0609-a5a3-4e98-a361-46313ef8c9d5	896f013a-fef5-44b1-a1a8-3707d8a5e332	64aba149-2ac6-4929-a5d2-f19ad1ba5a60	knife	2025-06-24	f	f	f	2025-06-23 21:28:32.099+00	2025-09-06 04:10:33.58327+00	\N
4ebb39f2-2753-4295-b092-0ad2586f8322	896f013a-fef5-44b1-a1a8-3707d8a5e332	7b156c48-d6cd-4ac9-abe6-14c6df978130	nothubg	2025-09-03	f	f	f	2025-09-02 22:06:28.204+00	2025-09-06 04:10:33.58327+00	\N
17362a88-7ade-46fc-86b7-56a6232f35c8	896f013a-fef5-44b1-a1a8-3707d8a5e332	7e11f912-33fb-4d81-a05c-43a83f12aafc	Taxes are good	2025-09-06	f	f	f	2025-09-05 21:37:18.189166+00	2025-09-06 04:10:33.58327+00	\N
abe79aa8-51e9-484e-8b6f-a68aee954bd2	25e70717-9e94-40af-9a4c-07f918d6da46	7e11f912-33fb-4d81-a05c-43a83f12aafc	Greatness is found in solitude	2025-09-06	f	f	f	2025-09-05 21:41:49.56045+00	2025-09-06 04:10:33.58327+00	\N
73b837cb-fbaa-4e19-a589-41ee8554ca4a	25e70717-9e94-40af-9a4c-07f918d6da46	bdcf8aee-05a3-413a-afe4-081310145d36	got in stupid nonsensical argument with someone I love. #shame #regret #remorse	2025-09-07	f	f	f	2025-09-06 18:19:25.018059+00	2025-09-06 18:19:25.018059+00	\N
019b18ad-6fdb-4a31-a57d-7281d47b4cae	896f013a-fef5-44b1-a1a8-3707d8a5e332	bdcf8aee-05a3-413a-afe4-081310145d36	I already answered this	2025-09-07	f	f	f	2025-09-06 20:25:29.890249+00	2025-09-06 20:25:29.890249+00	\N
5047b14e-8f05-4222-88a5-4a1ed95afaf9	896f013a-fef5-44b1-a1a8-3707d8a5e332	01f102fa-cbf2-46fe-8dee-ed55372fac02	Yes	2025-09-08	f	f	f	2025-09-08 05:46:16.175622+00	2025-09-08 05:46:16.175622+00	\N
de806f28-ea43-4957-8fe7-2295906e9cbb	896f013a-fef5-44b1-a1a8-3707d8a5e332	67cdb3e7-b6c9-4c50-8b93-98e32166940d	A movie about all the plastic water bottles that don’t get recycled and how they chill at the dump with all the trash and all they want to do is be re used and made into things but they can’t because all the Barriers that prevent people from recycling … or something	2025-09-15	f	f	f	2025-09-15 23:48:07.576798+00	2025-09-16 00:40:04.933552+00	\N
6636e373-b0be-48fe-bc93-d23f803bd2c0	896f013a-fef5-44b1-a1a8-3707d8a5e332	978b9725-0033-4a74-a186-7679427f8ee7	no	2025-09-16	f	f	f	2025-09-16 00:48:10.547045+00	2025-09-16 00:48:10.547045+00	\N
633bdba6-0a5a-4406-90b8-28d12a47c392	896f013a-fef5-44b1-a1a8-3707d8a5e332	0b6b69de-e868-44a4-b938-87a1e7799007	"don't talk to strangers" like.... we NEED to talk to strangers. Well i guess this is more aimed to children but its all i could think of	2025-09-17	f	f	f	2025-09-17 17:00:43.540294+00	2025-09-17 17:00:43.540294+00	\N
d74a2677-1102-4ca3-95ef-07cf8ed8c170	896f013a-fef5-44b1-a1a8-3707d8a5e332	707d7a1b-77b8-4f5d-b32d-c4633ae3cb2c	NO	2025-09-11	f	t	f	2025-09-17 20:48:19.430768+00	2025-09-17 20:48:19.430768+00	\N
db4a9f2a-4bc2-442d-ac5c-2adf0c2b8996	896f013a-fef5-44b1-a1a8-3707d8a5e332	bd7cbfa5-a636-4d8b-a74a-662e0d9d9d29	NO	2025-09-01	f	t	f	2025-09-17 20:48:56.235578+00	2025-09-17 20:48:56.235578+00	\N
\.


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: daily_prompts daily_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prompts
    ADD CONSTRAINT daily_prompts_pkey PRIMARY KEY (id);


--
-- Name: daily_prompts daily_prompts_prompt_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prompts
    ADD CONSTRAINT daily_prompts_prompt_date_key UNIQUE (prompt_date);


--
-- Name: take_reactions take_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.take_reactions
    ADD CONSTRAINT take_reactions_pkey PRIMARY KEY (id);


--
-- Name: takes takes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.takes
    ADD CONSTRAINT takes_pkey PRIMARY KEY (id);


--
-- Name: takes takes_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.takes
    ADD CONSTRAINT takes_user_date_unique UNIQUE (user_id, prompt_date);


--
-- Name: takes unique_user_daily_take; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.takes
    ADD CONSTRAINT unique_user_daily_take UNIQUE (user_id, prompt_id);


--
-- Name: take_reactions unique_user_take_reaction; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.take_reactions
    ADD CONSTRAINT unique_user_take_reaction UNIQUE (take_id, actor_id, reaction_type);


--
-- Name: idx_comments_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_parent ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_take_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_take_created ON public.comments USING btree (take_id, created_at);


--
-- Name: idx_comments_take_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_take_id ON public.comments USING btree (take_id);


--
-- Name: idx_comments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);


--
-- Name: idx_daily_prompts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prompts_active ON public.daily_prompts USING btree (is_active, prompt_date);


--
-- Name: idx_daily_prompts_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prompts_date ON public.daily_prompts USING btree (prompt_date);


--
-- Name: idx_daily_prompts_source_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prompts_source_user ON public.daily_prompts USING btree (source_user_id) WHERE (source_user_id IS NOT NULL);


--
-- Name: idx_take_reactions_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_take_reactions_actor ON public.take_reactions USING btree (actor_id);


--
-- Name: idx_take_reactions_take; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_take_reactions_take ON public.take_reactions USING btree (take_id);


--
-- Name: idx_takes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_created_at ON public.takes USING btree (created_at);


--
-- Name: idx_takes_created_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_created_desc ON public.takes USING btree (created_at DESC);


--
-- Name: idx_takes_prompt_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_prompt_created ON public.takes USING btree (prompt_id, created_at);


--
-- Name: idx_takes_prompt_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_prompt_date ON public.takes USING btree (prompt_date);


--
-- Name: idx_takes_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_user_date ON public.takes USING btree (user_id, prompt_date);


--
-- Name: idx_takes_user_prompt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_takes_user_prompt ON public.takes USING btree (user_id, prompt_date);


--
-- Name: comments comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: takes takes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER takes_updated_at BEFORE UPDATE ON public.takes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: comments comments_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id);


--
-- Name: comments comments_take_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_take_id_fkey FOREIGN KEY (take_id) REFERENCES public.takes(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: daily_prompts daily_prompts_source_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prompts
    ADD CONSTRAINT daily_prompts_source_user_fkey FOREIGN KEY (source_user_id) REFERENCES public.profiles(id);


--
-- Name: take_reactions take_reactions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.take_reactions
    ADD CONSTRAINT take_reactions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: take_reactions take_reactions_take_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.take_reactions
    ADD CONSTRAINT take_reactions_take_id_fkey FOREIGN KEY (take_id) REFERENCES public.takes(id) ON DELETE CASCADE;


--
-- Name: takes takes_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.takes
    ADD CONSTRAINT takes_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.daily_prompts(id);


--
-- Name: takes takes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.takes
    ADD CONSTRAINT takes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: daily_prompts Admins can delete prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete prompts" ON public.daily_prompts FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: daily_prompts Admins can insert prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert prompts" ON public.daily_prompts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: daily_prompts Admins can update prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update prompts" ON public.daily_prompts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: daily_prompts Admins can view all prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all prompts" ON public.daily_prompts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: daily_prompts Anyone can view active prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active prompts" ON public.daily_prompts FOR SELECT USING ((is_active = true));


--
-- Name: takes Enable delete access for users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete access for users" ON public.takes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: takes Enable insert access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert access for authenticated users" ON public.takes FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) OR ((user_id IS NOT NULL) AND (user_id = auth.uid()))));


--
-- Name: comments Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.comments FOR SELECT TO authenticated USING (true);


--
-- Name: takes Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.takes FOR SELECT TO authenticated USING (true);


--
-- Name: takes Enable update access for users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update access for users" ON public.takes FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: takes Users can create their own takes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own takes" ON public.takes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: takes Users can view non-anonymous takes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view non-anonymous takes" ON public.takes FOR SELECT USING ((NOT is_anonymous));


--
-- Name: takes Users can view their own takes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own takes" ON public.takes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_prompts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: takes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.takes ENABLE ROW LEVEL SECURITY;

--
-- Name: takes temp_allow_all_reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY temp_allow_all_reads ON public.takes FOR SELECT TO authenticated USING (true);


--
-- Name: TABLE takes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.takes TO anon;
GRANT ALL ON TABLE public.takes TO authenticated;
GRANT ALL ON TABLE public.takes TO service_role;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;


--
-- Name: TABLE daily_prompts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.daily_prompts TO anon;
GRANT ALL ON TABLE public.daily_prompts TO authenticated;
GRANT ALL ON TABLE public.daily_prompts TO service_role;


--
-- Name: TABLE take_reactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.take_reactions TO anon;
GRANT ALL ON TABLE public.take_reactions TO authenticated;
GRANT ALL ON TABLE public.take_reactions TO service_role;


--
-- PostgreSQL database dump complete
--

