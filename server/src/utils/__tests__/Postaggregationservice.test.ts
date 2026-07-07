import { buildPostListPipeline, buildPostListWithCountPipeline } from '../../services/postAggregationService';

describe('buildPostListPipeline', () => {
  test('מתחיל בשלב $match עם ה-filter שהועבר', () => {
    const pipeline = buildPostListPipeline({ isBlocked: { $ne: true } }) as any[];
    expect(pipeline[0]).toEqual({ $match: { isBlocked: { $ne: true } } });
  });

  test('לא מוסיף $skip/$limit כשלא הועברו (למשל בחיפוש בלי pagination)', () => {
    const pipeline = buildPostListPipeline({}) as any[];
    const hasSkip = pipeline.some((stage) => '$skip' in stage);
    const hasLimit = pipeline.some((stage) => '$limit' in stage);
    expect(hasSkip).toBe(false);
    expect(hasLimit).toBe(false);
  });

  test('מוסיף $skip ו-$limit כשהועברו (לצורך pagination)', () => {
    const pipeline = buildPostListPipeline({}, 10, 5) as any[];
    expect(pipeline).toEqual(expect.arrayContaining([{ $skip: 10 }, { $limit: 5 }]));
  });

  test('כולל lookup לתגובות עם חישוב commentCount ו-lastComment', () => {
    const pipeline = buildPostListPipeline({}) as any[];
    const addFieldsStage = pipeline.find((stage) => '$addFields' in stage) as any;
    expect(addFieldsStage).toBeDefined();
    expect(addFieldsStage.$addFields).toHaveProperty('commentCount');
    expect(addFieldsStage.$addFields).toHaveProperty('lastComment');
  });
});

describe('buildPostListWithCountPipeline', () => {
  test('בונה שלב $facet עם data ו-totalCount יחד', () => {
    const pipeline = buildPostListWithCountPipeline({}, 0, 10) as any[];
    const facetStage = pipeline.find((stage) => '$facet' in stage) as any;

    expect(facetStage).toBeDefined();
    expect(facetStage.$facet).toHaveProperty('data');
    expect(facetStage.$facet).toHaveProperty('totalCount');
  });

  test('שלב ה-$match הראשון משתמש בפילטר שהועבר', () => {
    const filter = { isBlocked: { $ne: true }, category: 'פיתוח' };
    const pipeline = buildPostListWithCountPipeline(filter, 0, 10) as any[];
    expect(pipeline[0]).toEqual({ $match: filter });
  });
});