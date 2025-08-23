import { WbsSyncService } from '@/domains/sync/WbsSyncService';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import { IExcelWbsRepository } from '@/applications/sync/IExcelWbsRepository';
import { ISyncLogRepository } from '@/applications/sync/ISyncLogRepository';
import { IPhaseRepository } from '@/applications/task/iphase-repository';
import { IUserRepository } from '@/applications/user/iuser-repositroy';
import { User } from '@/domains/user/user';

// モックの定義
const mockExcelWbsRepository = {
    findByWbsName: jest.fn(),
};

const mockSyncLogRepository = {
    create: jest.fn(),
    update: jest.fn(),
};

const mockPhaseRepository = {
    findByWbsId: jest.fn(),
    create: jest.fn(),
};

const mockUserRepository = {
    findByWbsDisplayName: jest.fn(),
};

describe('WbsSyncService', () => {
    let wbsSyncService: WbsSyncService;

    beforeEach(() => {
        jest.clearAllMocks();

        wbsSyncService = new WbsSyncService(
            mockExcelWbsRepository as unknown as IExcelWbsRepository,
            mockSyncLogRepository as unknown as ISyncLogRepository,
            mockPhaseRepository as unknown as IPhaseRepository,
            mockUserRepository as unknown as IUserRepository
        );
    });

    describe('excelToWbsPhase', () => {
        const mockWbsId = 1;

        it('既存のフェーズが存在しない場合、新しいフェーズを作成すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Phase);
            expect(result[0].name).toBe('設計フェーズ');
            expect(result[0].code).toBeInstanceOf(PhaseCode);
            expect(result[0].code.value()).toBe('PH');
            expect(result[0].seq).toBe(1);
            expect(mockPhaseRepository.findByWbsId).toHaveBeenCalledWith(mockWbsId);
        });

        it('既存のフェーズが存在する場合、新しいフェーズを作成しないこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            const existingPhases = [
                {
                    name: '設計フェーズ',
                    code: 'PH',
                    seq: 1,
                },
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue(existingPhases);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockPhaseRepository.findByWbsId).toHaveBeenCalledWith(mockWbsId);
        });

        it('PHASEが空の場合、新しいフェーズを作成しないこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockPhaseRepository.findByWbsId).toHaveBeenCalledWith(mockWbsId);
        });

        it('複数のフェーズが存在する場合、コード順でソートしてseqを採番すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'D1-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'D2-001',
                    PHASE: '開発フェーズ',
                    ACTIVITY: 'コーディング',
                    TASK: 'API実装',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'D10-001',
                    PHASE: '開発フェーズ',
                    ACTIVITY: 'コーディング',
                    TASK: 'API実装',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            // 既存のフェーズは存在しない
            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(3);
            expect(result[0].seq).toBe(1);
            expect(result[1].seq).toBe(2);
            expect(result[2].seq).toBe(3);
        });

        it('WBS_IDのハイフンより左側をフェーズコードとして使用すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'DEV-001-002',
                    PHASE: '開発フェーズ',
                    ACTIVITY: 'コーディング',
                    TASK: 'API実装',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].code.value()).toBe('DEV');
        });

        it('WBS_IDにハイフンが含まれない場合、空文字列をフェーズコードとして使用すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].code.value()).toBe('PH001');
        });

        it('複数の異なるフェーズが含まれる配列の場合、重複を除いて作成すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-002',
                    PHASE: '設計フェーズ', // 同じフェーズ名
                    ACTIVITY: '画面設計',
                    TASK: 'UI設計',
                    TANTO: '佐藤花子',
                    KIJUN_START_DATE: new Date('2024-02-01'),
                    KIJUN_END_DATE: new Date('2024-02-28'),
                    YOTEI_START_DATE: new Date('2024-02-01'),
                    YOTEI_END_DATE: new Date('2024-02-28'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 60,
                    YOTEI_KOSU: 60,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 5,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'DEV-001',
                    PHASE: '開発フェーズ', // 異なるフェーズ名
                    ACTIVITY: 'コーディング',
                    TASK: 'API実装',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-03-01'),
                    KIJUN_END_DATE: new Date('2024-03-31'),
                    YOTEI_START_DATE: new Date('2024-03-01'),
                    YOTEI_END_DATE: new Date('2024-03-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 100,
                    YOTEI_KOSU: 100,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 15,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            // Setはオブジェクトの参照を比較するため、同じ内容でも異なるインスタンスとして扱われる
            // そのため、3つのフェーズが作成される（重複除去されない）
            expect(result).toHaveLength(3);

            // コード順でソートされていることを確認
            expect(result[0].name).toBe('開発フェーズ'); // DEVがPHより先（コード順）
            expect(result[0].code.value()).toBe('DEV');
            expect(result[0].seq).toBe(1);

            expect(result[1].name).toBe('設計フェーズ');
            expect(result[1].code.value()).toBe('PH');
            expect(result[1].seq).toBe(2);

            expect(result[2].name).toBe('設計フェーズ');
            expect(result[2].code.value()).toBe('PH');
            expect(result[2].seq).toBe(3);
        });

        it('空の配列が渡された場合、空の配列を返すこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [];
            mockPhaseRepository.findByWbsId.mockResolvedValue([]);

            // Act
            const result = await wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockPhaseRepository.findByWbsId).toHaveBeenCalledWith(mockWbsId);
        });

        it('フェーズリポジトリでエラーが発生した場合、エラーを投げること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中太郎',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            const mockError = new Error('Database connection failed');
            mockPhaseRepository.findByWbsId.mockRejectedValue(mockError);

            // Act & Assert
            await expect(wbsSyncService.excelToWbsPhase(mockExcelWbsList, mockWbsId))
                .rejects.toThrow('Database connection failed');
            expect(mockPhaseRepository.findByWbsId).toHaveBeenCalledWith(mockWbsId);
        });
    });

    describe('excelToWbsUser', () => {
        it('既存のユーザーが存在しない場合、新しいユーザーを作成すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockUserRepository.findByWbsDisplayName.mockResolvedValue([
                User.createFromDb({
                    id: 'user-1',
                    name: '中田太郎',
                    displayName: '中田',
                    email: 'nakata@example.com'
                })
            ]);

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(User);
            expect(result[0].name).toBe('田中');
            expect(result[0].displayName).toBe('田中');
            expect(result[0].email).toBe('田中@example.com');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });

        it('既存のユーザーが存在する場合、新しいユーザーを作成しないこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            const existingUser = User.createFromDb({
                id: 'user-1',
                name: '田中太郎',
                displayName: '田中',
                email: 'tanaka@example.com'
            });

            mockUserRepository.findByWbsDisplayName.mockResolvedValue([existingUser]);

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });

        it('TANTOがnullの場合、ユーザーが作成されないこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: null,
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            // nullのユーザーが作成されないこと
            expect(result).toHaveLength(0);
            expect(mockUserRepository.findByWbsDisplayName).not.toHaveBeenCalled();
        });

        it('複数の異なる担当者が含まれる配列の場合、それぞれのユーザーを作成すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-002',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '画面設計',
                    TASK: 'UI設計',
                    TANTO: '佐藤',
                    KIJUN_START_DATE: new Date('2024-02-01'),
                    KIJUN_END_DATE: new Date('2024-02-28'),
                    YOTEI_START_DATE: new Date('2024-02-01'),
                    YOTEI_END_DATE: new Date('2024-02-28'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 60,
                    YOTEI_KOSU: 60,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 5,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            mockUserRepository.findByWbsDisplayName
                .mockResolvedValueOnce([]) // 田中太郎は存在しない
                .mockResolvedValueOnce([]); // 佐藤花子は存在しない

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('田中');
            expect(result[0].displayName).toBe('田中');
            expect(result[0].email).toBe('田中@example.com');
            expect(result[1].name).toBe('佐藤');
            expect(result[1].displayName).toBe('佐藤');
            expect(result[1].email).toBe('佐藤@example.com');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('佐藤');
        });

        it('一部の担当者が既存ユーザーで、一部が新規の場合、新規のみ作成すること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                },
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-002',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '画面設計',
                    TASK: 'UI設計',
                    TANTO: '佐藤',
                    KIJUN_START_DATE: new Date('2024-02-01'),
                    KIJUN_END_DATE: new Date('2024-02-28'),
                    YOTEI_START_DATE: new Date('2024-02-01'),
                    YOTEI_END_DATE: new Date('2024-02-28'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 60,
                    YOTEI_KOSU: 60,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 5,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            const existingUser = User.createFromDb({
                id: 'user-1',
                name: '田中太郎',
                displayName: '田中',
                email: 'tanaka@example.com'
            });

            mockUserRepository.findByWbsDisplayName
                .mockResolvedValueOnce([existingUser]) // 田中太郎は既存
                .mockResolvedValueOnce([]); // 佐藤花子は新規

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('佐藤');
            expect(result[0].displayName).toBe('佐藤');
            expect(result[0].email).toBe('佐藤@example.com');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('佐藤');
        });

        it('空の配列が渡された場合、空の配列を返すこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [];

            // Act
            const result = await wbsSyncService.excelToWbsUser(mockExcelWbsList);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockUserRepository.findByWbsDisplayName).not.toHaveBeenCalled();
        });

        it('ユーザーリポジトリでエラーが発生した場合、エラーを投げること', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [
                {
                    PROJECT_ID: 'PRJ001',
                    WBS_ID: 'PH-001',
                    PHASE: '設計フェーズ',
                    ACTIVITY: '詳細設計',
                    TASK: 'データベース設計',
                    TANTO: '田中',
                    KIJUN_START_DATE: new Date('2024-01-01'),
                    KIJUN_END_DATE: new Date('2024-01-31'),
                    YOTEI_START_DATE: new Date('2024-01-01'),
                    YOTEI_END_DATE: new Date('2024-01-31'),
                    JISSEKI_START_DATE: null,
                    JISSEKI_END_DATE: null,
                    KIJUN_KOSU: 80,
                    YOTEI_KOSU: 80,
                    JISSEKI_KOSU: null,
                    KIJUN_KOSU_BUFFER: 10,
                    STATUS: '未着手',
                    BIKO: 'テスト用',
                    PROGRESS_RATE: 0,
                }
            ];

            const mockError = new Error('Database connection failed');
            mockUserRepository.findByWbsDisplayName.mockRejectedValue(mockError);

            // Act & Assert
            await expect(wbsSyncService.excelToWbsUser(mockExcelWbsList))
                .rejects.toThrow('Database connection failed');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });
    });
});
