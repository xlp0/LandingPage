import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  programOf,
  matchesQuery,
  filterSprints,
  groupSprints,
  parseRegistryUrlState,
  mergeRegistryUrlState
} from '../../js/ui/registry-view.js';

const FIXTURE = [
  {
    code: '00-PROGRAM-CHARTER-EPIC-ORC-II',
    title: 'Orchestration Charter',
    handle: 'urn:pcard:sprint:00-PROGRAM-CHARTER-EPIC-ORC-II',
    card_type: 'specification_mcard',
    dod: { state: 'specification', total: 0, vcard_refs: [] }
  },
  {
    code: 'PKC-06',
    title: 'Dragology Algebra and TFZ LLM',
    handle: 'urn:pcard:sprint:PKC-06',
    card_type: 'pcard',
    dod: { state: 'sealed', total: 5, vcard_refs: ['LandingPage/PkcCardIsland'] }
  },
  {
    code: 'PKC-01',
    title: 'Subtraction Census',
    handle: 'urn:pcard:sprint:PKC-01',
    card_type: 'pcard',
    dod: { state: 'sealed', total: 3, vcard_refs: ['clm-kernel'] }
  },
  {
    code: 'CDO-16',
    title: 'Fiber Certification',
    handle: 'urn:pcard:sprint:CDO-16',
    card_type: 'pcard',
    dod: { state: 'sealed', total: 4, vcard_refs: ['LandingPage/witness'] }
  },
  {
    code: 'lowercase_code',
    title: 'Unprefixed Entry',
    handle: 'urn:pcard:sprint:lowercase_code',
    card_type: 'specification_mcard',
    dod: { state: 'specification', total: 0, vcard_refs: [] }
  }
];

describe('DCI-01 registry-view pure helpers', () => {
  it('programOf handles program charter epics, standard prefixes, and OTHER fallback', () => {
    assert.equal(programOf('00-PROGRAM-CHARTER-EPIC-ORC-II'), 'ORC');
    assert.equal(programOf('PKC-06'), 'PKC');
    assert.equal(programOf('lowercase_code'), 'OTHER');
    assert.equal(programOf('123-ABC'), 'OTHER');
    assert.equal(programOf(''), 'OTHER');
  });

  it('matchesQuery matches code, title, and dod.vcard_refs case-insensitively and accepts empty query', () => {
    const pkc06 = FIXTURE[1];
    assert.equal(matchesQuery(pkc06, ''), true);
    assert.equal(matchesQuery(pkc06, '   '), true);
    assert.equal(matchesQuery(pkc06, 'pkc-06'), true);
    assert.equal(matchesQuery(pkc06, 'tfz llm'), true);
    assert.equal(matchesQuery(pkc06, 'landingpage'), true);
    assert.equal(matchesQuery(pkc06, 'nonexistent'), false);
  });

  it('filterSprints filters by state, program, and query individually and together while preserving order', () => {
    assert.deepEqual(
      filterSprints(FIXTURE, {}).map((s) => s.code),
      FIXTURE.map((s) => s.code)
    );
    assert.deepEqual(
      filterSprints(FIXTURE, { state: 'specification' }).map((s) => s.code),
      ['00-PROGRAM-CHARTER-EPIC-ORC-II', 'lowercase_code']
    );
    assert.deepEqual(
      filterSprints(FIXTURE, { program: 'PKC' }).map((s) => s.code),
      ['PKC-06', 'PKC-01']
    );
    assert.deepEqual(
      filterSprints(FIXTURE, { query: 'landingpage' }).map((s) => s.code),
      ['PKC-06', 'CDO-16']
    );
    assert.deepEqual(
      filterSprints(FIXTURE, { state: 'sealed', program: 'PKC', query: 'dragology' }).map((s) => s.code),
      ['PKC-06']
    );
  });

  it('groupSprints sorts groups by program code with accurate sealed and specification counts', () => {
    const grouped = groupSprints(FIXTURE);
    assert.deepEqual(
      grouped.map((g) => ({
        program: g.program,
        total: g.sprints.length,
        sealed: g.sealed,
        specification: g.specification
      })),
      [
        { program: 'CDO', total: 1, sealed: 1, specification: 0 },
        { program: 'ORC', total: 1, sealed: 0, specification: 1 },
        { program: 'OTHER', total: 1, sealed: 0, specification: 1 },
        { program: 'PKC', total: 2, sealed: 2, specification: 0 }
      ]
    );
  });

  it('parseRegistryUrlState validates state and program and drops unknown values', () => {
    const programs = ['CDO', 'ORC', 'PKC'];
    assert.deepEqual(parseRegistryUrlState('?state=sealed&program=PKC&q=landingpage', { programs }), {
      state: 'sealed',
      program: 'PKC',
      query: 'landingpage'
    });
    assert.deepEqual(parseRegistryUrlState('?state=foo&program=NOPE&q=abc', { programs }), {
      state: '',
      program: '',
      query: 'abc'
    });
  });

  it('mergeRegistryUrlState replaces managed params while preserving foreign query parameters', () => {
    assert.equal(
      mergeRegistryUrlState('?display_mode=light&state=sealed&foo=bar', {
        state: '',
        program: 'PKC',
        query: 'tfz'
      }),
      '?display_mode=light&foo=bar&program=PKC&q=tfz'
    );
    assert.equal(
      mergeRegistryUrlState('?state=sealed&program=PKC&q=tfz', {
        state: '',
        program: '',
        query: ''
      }),
      ''
    );
  });
});
