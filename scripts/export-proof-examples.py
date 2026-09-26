"""Export small, verified single-goal examples from the actual ScaleLogic generator.

Usage: python scripts/export-proof-examples.py --source ../searchRL
The research repository is imported read-only; no model or backend is needed.
"""
import argparse
import hashlib
import itertools
import json
from pathlib import Path
import random
import string
import sys

sys.dont_write_bytecode = True
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
source = args.source.resolve()
sys.path[:0] = [str(source / 'data/search_logic_graph'), str(source / 'sft')]
from generator_v2 import generate_logic_graph
from sft_solver import solve


def key(lit, person=None):
    return (lit['node'], person if lit['person'] == 0 else lit['person'], lit['neg'])


def verify_step(st):
    """Independently truth-table check each inference against its exact rule."""
    r = st['rule']
    atoms = sorted({x[:2] for x in [*r['prem'], *r['conc'], *st['support'], st['concl']]})
    for bits in itertools.product([False, True], repeat=len(atoms)):
        env = dict(zip(atoms, bits))
        truth = lambda l: env[l[:2]] != l[2]
        rule_true = not all(map(truth, r['prem'])) or any(map(truth, r['conc']))
        if rule_true and all(map(truth, st['support'])):
            assert truth(st['concl']), 'Invalid inference'


def export(level, depth, seed):
    graph = generate_logic_graph(
        num_persons=2, max_edges=depth+1, max_depth=depth, max_arity=2,
        no_reuse=True, no_disjunction=level<3, no_negation=level<2,
        no_conjunction=level<1, p_small_arity=1.,
        p_forall=.55 if level==4 else 0., p_negate_node=.35,
        p_sibling_neg=1., deep_first=True, seed=seed)
    if graph['max_depth'] != depth:
        return None
    proof = solve(graph['edges'], 'node0', 1, False, 2)
    if not proof or any(st['type'] == 'cases' for st in proof['steps']):
        return None
    steps = proof['steps']
    if level >= 1 and not any(len(st['rule']['prem'])>1 for st in steps): return None
    if level >= 2 and not any(l[2] for st in steps for l in st['support']): return None
    if level >= 3 and not any(st['type']=='refute' for st in steps): return None
    if level == 4 and not any(st['rule']['forall'] for st in steps): return None
    # Confirm consistency (a contradictory proof would establish any goal).
    known = set(proof['used_given'])
    for st in steps:
        assert set(st['support']) <= known
        verify_step(st)
        known.add(st['concl'])
    assert not any((n,p,not neg) in known for n,p,neg in known)
    assert proof['goal'] in known

    rng = random.Random(seed+100000)
    names = ['Alice','Bob','Carol','David','Emma','Frank','Grace','Henry','Irene','Jack']
    rng.shuffle(names)
    all_ids = sorted({l['node'] for e in graph['edges'] for l in e['premises']+e['conclusions']})
    props = {}
    for node in all_ids:
        prop = ''.join(rng.choices(string.ascii_lowercase, k=5))
        while prop in props.values(): prop = ''.join(rng.choices(string.ascii_lowercase, k=5))
        props[node] = prop
    def nl(l):
        return f"{names[l[1]-1] if l[1] else 'X'} is {'not ' if l[2] else ''}{props[l[0]]}"
    def symbol(l):
        return f"{'¬' if l[2] else ''}{props[l[0]]}({names[l[1]-1] if l[1] else 'x'})"
    def rule_text(e):
        pre = ' and '.join(nl(key(l,0)) for l in e['premises'])
        con = ' or '.join(nl(key(l,0)) for l in e['conclusions'])
        return ('For any person X, if ' if any(l['person']==0 for l in e['premises']+e['conclusions']) else 'If ') + pre + ', then ' + con + '.'

    statements, nodes, by_lit, by_edge = [], [], {}, {}
    used_facts = sorted(proof['used_given'])
    if len(used_facts) > (3 if depth == 3 else 6): return None
    depths = []
    for i,l in enumerate(used_facts):
        sid = f'F{i+1}'
        statements.append({'id':sid, 'kind':'fact', 'text':nl(l)+'.'})
        nid = f'n{len(nodes)}'
        nodes.append({'id':nid,'lines':[symbol(l)],'text':nl(l), 'step':0,'rank':0,'deps':[], 'source':sid,'operation':'Given fact','explanation':nl(l)+'.'})
        by_lit[l] = nid
        depths.extend(c['depth'] for e in graph['edges'] if e['type']=='assign' for c in e['conclusions'] if key(c)==l)
    if max(depths, default=0) != depth: return None

    count = 0
    for st in steps:
        r = st['rule']
        # Recover the original (potentially universal) rule, never display only
        # a grounded rule when the reasoning requires universal instantiation.
        edge_i = next(i for i,e in enumerate(graph['edges']) if e['type']=='implication'
            and tuple(key(l,r['person']) for l in e['premises'])==r['prem']
            and tuple(key(l,r['person']) for l in e['conclusions'])==r['conc'])
        if edge_i not in by_edge:
            rid = f'R{len(by_edge)+1}'
            by_edge[edge_i] = rid
            statements.append({'id':rid, 'kind':'rule', 'text':rule_text(graph['edges'][edge_i])})
        rid = by_edge[edge_i]
        deps = [by_lit[l] for l in r['prem']]
        def add(lines, text, deps, operation, explanation):
            nonlocal count
            count += 1
            nid = f'n{len(nodes)}'
            rank = 1+max(next(n['rank'] for n in nodes if n['id']==d) for d in deps)
            nodes.append({'id':nid,'lines':lines,'text':text,'step':count,'rank':rank,
                'deps':deps,'source':rid,'operation':operation,'explanation':explanation})
            return nid
        prefix = f"Instantiate {rid} for {names[r['person']-1]}. " if r['forall'] else ''
        operation = 'Universal instantiation' if r['forall'] else ('Conjunction + implication' if len(r['prem'])>1 else 'Implication')
        reason = prefix + 'Given that ' + ' and '.join(nl(l) for l in r['prem']) + f', apply {rid} to conclude that ' + ' or '.join(nl(l) for l in r['conc']) + '.'
        if st['type']=='refute':
            disj = add([symbol(l) + (' ∨' if i<len(r['conc'])-1 else '') for i,l in enumerate(r['conc'])], ' or '.join(nl(l) for l in r['conc']), deps, operation, reason)
            blockers = [(n,p,not neg) for n,p,neg in st['sibs']]
            deps = [disj]+[by_lit[l] for l in blockers]
            nid = add([symbol(st['concl'])], nl(st['concl']), deps, 'Disjunction elimination', 'The disjunction holds. Since ' + ' and '.join(nl(l) for l in blockers) + ', the other alternative is ruled out. Therefore, ' + nl(st['concl']) + '.')
        else:
            nid = add([symbol(st['concl'])],nl(st['concl']),deps,operation,reason)
        by_lit[st['concl']] = nid
    nodes[-1]['goal'] = True
    return {'id':f'L{level}-D{depth}-S{seed}','level':level,'depth':depth,'seed':seed,
        'goal':nl(proof['goal'])+'.','statements':statements,'nodes':nodes,'steps':count}


bank = []
for level in range(5):
    for depth in [3,5,7]:
        examples = []
        for trial in range(3000):
            seed = 20260926 + level*100000+depth*5000+trial
            example = export(level,depth,seed)
            if example:
                examples.append(example)
            if len(examples)==10: break
        assert len(examples)==10, (level,depth,len(examples))
        bank.extend(examples)
        print(f'Level {level}, depth {depth}: {len(examples)} verified examples')

root = Path(__file__).resolve().parents[1]
dest = root / 'projects/scalelogic/assets/proof-examples.js'
dest.write_text('/* Generated by scripts/export-proof-examples.py. */\nwindow.SCALELOGIC_EXAMPLES = '+json.dumps(bank,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
sources = ['data/search_logic_graph/generator_v2.py','sft/sft_solver.py']
meta = {'examples':len(bank),'depths':[3,5,7],'examplesPerSetting':10,
    'sourceHashes':{p:hashlib.sha256((source/p).read_bytes()).hexdigest() for p in sources},
    'notes':'Single generated proof graphs, not four-choice benchmark items. Five-letter predicate labels follow the dataset renderer. No reuse; binary arity; refuted-sibling disjunctions. Each step independently truth-table checked. Playback splits disjunction introduction and elimination; playback steps differ from generator depth.'}
(dest.parent/'proof-examples-provenance.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print(f'Exported {len(bank)} examples; {dest.stat().st_size:,} bytes')
