# Builds .claude/agents/*.md by copying rule text verbatim from MASTER_PROMPT.md.
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
lines = (root / 'MASTER_PROMPT.md').read_text(encoding='utf-8').split('\n')

def section(title, level):
    """Return heading `title` of given level with body until next heading of same or higher level."""
    start = next(i for i, l in enumerate(lines) if l.strip() == '#' * level + ' ' + title)
    end = len(lines)
    for j in range(start + 1, len(lines)):
        m = re.match(r'^(#+) ', lines[j])
        if m and len(m.group(1)) <= level:
            end = j
            break
    return '\n'.join(lines[start:end]).strip()

def h2(prefix):
    t = next(l[3:] for l in lines if l.startswith('## ' + prefix))
    return section(t, 2)

rev = section('Требования к рецензентам', 3)
def row(name):
    hdr = [l for l in rev.split('\n') if l.startswith('| Агент') or l.startswith('| ---')]
    r = [l for l in rev.split('\n') if l.startswith('| `' + name + '`')]
    return '\n'.join(hdr + r) if r else ''
def item(name):
    out = [l for l in rev.split('\n') if l.startswith('- **`' + name + '`.**')]
    return '\n'.join(out)

cover = section('Требования к обложке', 3)
hook = section('Требования к хуку и удержанию', 3)
script = section('Требования к сценарию', 3)
series = section('Требования к сериям', 3)
alive = section('Живые компоненты', 3)
sound = section('Звук', 3)

TOOLS = 'Read, Glob, Grep, Write'
agents = {
 'topic-analyst': ('Reads the brief and the whole source, writes the topic analysis and decides one video or a series. Use at stage 2.',
   'You are a topic analyst for a vertical motion-graphics explainer. You do not write the script.\n'
   'Read the brief and the source in full. Write content/analysis.md: the main idea in one sentence, the explanation steps, '
   'terms with plain definitions, numbers and facts with their exact place in the source, what the viewer thinks before and after. '
   'Then decide one video or a series and, for a series, write content/series-plan.md.',
   [series], TOOLS),
 'fact-checker': ('Checks every claim, number and on-screen label against the source. Use at stages 6, 15 and 18.',
   'You are a fact checker for a vertical motion-graphics explainer. You did not make it.\n'
   'Write the report to content/reviews/facts.md: verdict, findings (where, what is wrong, which rule, how to fix), the claims table.',
   [row('fact-checker'), item('fact-checker')], TOOLS),
 'speech-editor': ('Edits the tts and display texts of the script before voice generation. Use at stage 6.',
   'You are a Russian speech editor for a voice-over script. You did not write it.\n'
   'Write the report to content/reviews/speech.md: verdict, findings (where, what is wrong, which rule, how to fix).',
   [row('speech-editor'), item('speech-editor'), script, h2('8.')], TOOLS),
 'retention-editor': ('Reviews hook, cover and retention as a viewer ready to swipe away. Use at stages 6, 10, 15 and 18.',
   'You are a retention editor for a vertical motion-graphics explainer. You did not make it.\n'
   'Write the report to content/reviews/retention.md: verdict, findings (where, what is wrong, which rule, how to fix), '
   'the risk map, rubric scores with one sentence of evidence each.',
   [row('retention-editor'), hook, cover], TOOLS),
 'sound-designer': ('Builds the sound map from the storyboard, timeline, sfx catalog and Earshot ranking. Use at stage 13.',
   'You are a sound designer for a vertical motion-graphics explainer. Music is forbidden.\n'
   'Write content/sound-map.md: for each event the effect, frame, volume, playback rate and the reason.',
   [item('sound-designer'), sound], TOOLS),
 'art-director': ('Reviews style frames, cover variants and contact sheets against the art direction rules. Use at stages 10, 15 and 18.',
   'You are an art director reviewing a vertical motion-graphics explainer. You did not make it.\n'
   'Judge only what you see in the image files passed to you, not the code and not the intent.\n'
   'Write the report to content/reviews/art.md: verdict, findings (where, what is wrong, which rule, how to fix), '
   'rubric scores with one sentence of evidence each.',
   [row('art-director'), item('art-director'), h2('6.'), h2('7.'), cover], TOOLS),
 'motion-critic': ('Reviews hero-transformation strips, the qa-motion report and the timeline. Use at stages 15 and 18.',
   'You are a motion critic reviewing a vertical motion-graphics explainer. You did not make it.\n'
   'Judge only the frame strips, the qa-motion report and the timeline passed to you.\n'
   'Write the report to content/reviews/motion.md: verdict, findings (where, what is wrong, which rule, how to fix), '
   'rubric scores with one sentence of evidence each.',
   [row('motion-critic'), item('motion-critic'), h2('5.'), alive], TOOLS),
 'first-viewer': ('A first-time viewer retelling the video from contact sheets and caption text only. Use at stages 15 and 18.',
   'You are a first-time viewer. You know nothing about this project.\n'
   'Read only files inside out/qa/viewer/. Never read any file outside that folder.\n'
   'Answer: the main idea of the video in one sentence; what you understood from each scene; where you got confused; '
   'what question the first frame raised. Return the answer as your final message.',
   [row('first-viewer'), item('first-viewer')], 'Read'),
}
d = root / '.claude' / 'agents'
d.mkdir(parents=True, exist_ok=True)
for name, (desc, intro, parts, tools) in agents.items():
    body = '\n\n'.join(p for p in parts if p)
    (d / f'{name}.md').write_text(
        f'---\nname: {name}\ndescription: {desc}\ntools: {tools}\n---\n{intro}\n\nRules (verbatim from MASTER_PROMPT.md):\n\n{body}\n',
        encoding='utf-8')
    print(name, len(body))
