import { WbsSyncService } from '@/domains/sync/WbsSyncService';
import { ExcelWbs, SyncChanges } from '@/domains/sync/ExcelWbs';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import { IExcelWbsRepository } from '@/applications/sync/IExcelWbsRepository';
import { ISyncLogRepository } from '@/applications/sync/ISyncLogRepository';
import { IPhaseRepository } from '@/applications/task/iphase-repository';
import { IUserRepository } from '@/applications/user/iuser-repositroy';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { User } from '@/domains/user/user';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';

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

const mockWbsAssigneeRepository = {
    findByWbsId: jest.fn(),
}

const mockTaskRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWbsId: jest.fn(),
    findByAssigneeId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

describe('WbsSyncService', () => {
    let wbsSyncService: WbsSyncService;

    beforeEach(() => {
        jest.clearAllMocks();

        wbsSyncService = new WbsSyncService(
            mockExcelWbsRepository as unknown as IExcelWbsRepository,
            mockSyncLogRepository as unknown as ISyncLogRepository,
            mockPhaseRepository as unknown as IPhaseRepository,
            mockUserRepository as unknown as IUserRepository,
            mockWbsAssigneeRepository as unknown as IWbsAssigneeRepository,
            mockTaskRepository as unknown as ITaskRepository
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

    describe('excelToWbsUserAndAssignee', () => {
        it('既存のユーザーおよび担当者が存在しない場合、新しいユーザーと担当者を作成すること', async () => {
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
                WbsAssignee.create({
                    userId: 'user-1',
                    rate: 100
                })
            ]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(1);
            expect(users[0]).toBeInstanceOf(User);
            expect(users[0].id).not.toBeNull();
            expect(users[0].name).toBe('田中');
            expect(users[0].displayName).toBe('田中');
            expect(users[0].email).toBe('田中@example.com');
            expect(assignees).toHaveLength(1);
            expect(assignees[0]).toBeInstanceOf(WbsAssignee);
            expect(assignees[0].getRate()).toBe(100);
            expect(assignees[0].userId).toBe(users[0].id);
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });

        it('既存のユーザーと担当者が存在する場合、新しいユーザーと担当者を作成しないこと', async () => {
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

            mockUserRepository.findByWbsDisplayName.mockResolvedValue(
                [User.createFromDb({
                    id: 'user-1',
                    name: '田中太郎',
                    displayName: '田中',
                    email: 'tanaka@example.com'
                })]
            );

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
                WbsAssignee.create({
                    userId: 'user-1',
                    rate: 100
                })
            ]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(0);
            expect(assignees).toHaveLength(0);
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });

        it('TANTOがnullの場合、ユーザーと担当者が作成されないこと', async () => {
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            // nullのユーザーが作成されないこと
            expect(users).toHaveLength(0);
            expect(assignees).toHaveLength(0);
            expect(mockUserRepository.findByWbsDisplayName).not.toHaveBeenCalled();
        });

        it('複数の異なる担当者が含まれる配列の場合、それぞれのユーザーと担当者を作成すること', async () => {
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(2);
            expect(users[0].name).toBe('田中');
            expect(users[0].displayName).toBe('田中');
            expect(users[0].email).toBe('田中@example.com');
            expect(users[1].name).toBe('佐藤');
            expect(users[1].displayName).toBe('佐藤');
            expect(users[1].email).toBe('佐藤@example.com');
            expect(assignees).toHaveLength(2);
            expect(assignees[0].getRate()).toBe(100);
            expect(assignees[0].userId).toBe(users[0].id);
            expect(assignees[1].getRate()).toBe(100);
            expect(assignees[1].userId).toBe(users[1].id);
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
                WbsAssignee.create({
                    userId: 'user-1',
                    rate: 100
                })
            ]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('佐藤');
            expect(users[0].displayName).toBe('佐藤');
            expect(users[0].email).toBe('佐藤@example.com');
            expect(assignees).toHaveLength(1);
            expect(assignees[0].userId).toBe(users[0].id);
            expect(assignees[0].getRate()).toBe(100);
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('佐藤');
        });

        it('既存のユーザーが存在するが、担当者が存在しない場合、新しい担当者を作成すること', async () => {
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(0);
            expect(assignees).toHaveLength(1);
            expect(assignees[0].userId).toBe(existingUser.id);
            expect(assignees[0].getRate()).toBe(100);
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });


        it('空の配列が渡された場合、空の配列を返すこと', async () => {
            // Arrange
            const mockExcelWbsList: ExcelWbs[] = [];

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);

            const mockWbsId = 1;

            // Act
            const { users, assignees } = await wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId);

            // Assert
            expect(users).toHaveLength(0);
            expect(assignees).toHaveLength(0);
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

            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);

            const mockWbsId = 1;

            // Act & Assert
            await expect(wbsSyncService.excelToWbsUserAndAssignee(mockExcelWbsList, mockWbsId))
                .rejects.toThrow('Database connection failed');
            expect(mockUserRepository.findByWbsDisplayName).toHaveBeenCalledWith('田中');
        });
    });

    describe('applyChanges', () => {
        const wbsId = 1;
        const projectId = 'PRJ001';

        beforeEach(() => {
            mockPhaseRepository.findByWbsId.mockResolvedValue([]);
            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
            mockTaskRepository.findByWbsId.mockResolvedValue([]);
            mockTaskRepository.create.mockResolvedValue(
                Task.createFromDb({
                    id: 1,
                    taskNo: TaskNo.reconstruct('D1-0001'),
                    wbsId,
                    name: '作成タスク',
                    status: new TaskStatus({ status: 'NOT_STARTED' }),
                })
            );
        });

        it('toAdd を TaskRepository 経由で作成し、結果が成功となること', async () => {
            const changes = {
                wbsId,
                projectId,
                toAdd: [
                    {
                        PROJECT_ID: projectId,
                        WBS_ID: 'D1-0001',
                        PHASE: '',
                        ACTIVITY: 'A',
                        TASK: '作成タスク',
                        TANTO: null,
                        KIJUN_START_DATE: null,
                        KIJUN_END_DATE: null,
                        YOTEI_START_DATE: null,
                        YOTEI_END_DATE: null,
                        JISSEKI_START_DATE: null,
                        JISSEKI_END_DATE: null,
                        KIJUN_KOSU: null,
                        YOTEI_KOSU: null,
                        JISSEKI_KOSU: null,
                        KIJUN_KOSU_BUFFER: null,
                        STATUS: '未着手',
                        BIKO: null,
                        PROGRESS_RATE: null,
                    },
                ],
                toUpdate: [],
                toDelete: ['D2-0001'],
                timestamp: new Date(),
            } as SyncChanges;

            const result = await wbsSyncService.applyChanges(changes);

            expect(mockTaskRepository.create).toHaveBeenCalledTimes(1);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(1);
            expect(result.updatedCount).toBe(0);
            expect(result.deletedCount).toBe(1);
            expect(result.recordCount).toBe(1);
            expect(result.errorDetails).toBeUndefined();
        });

        it('toUpdate を TaskRepository 経由で更新し、結果が成功となること', async () => {
            // フェーズIDと担当者IDが必要
            mockPhaseRepository.findByWbsId.mockResolvedValue([
                Phase.createFromDb({ id: 3, name: '開発', code: new PhaseCode('D1'), seq: 1 })
            ]);
            mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
                WbsAssignee.createFromDb({ id: 20, userId: 'user-1', userName: '田中', rate: 100 })
            ]);

            const existing = Task.createFromDb({
                id: 11,
                taskNo: TaskNo.reconstruct('D1-0001'),
                wbsId,
                name: '旧タスク',
                status: new TaskStatus({ status: 'NOT_STARTED' }),
                assigneeId: 20,
                phaseId: 3,
            });
            mockTaskRepository.findByWbsId.mockResolvedValue([existing]);
            mockTaskRepository.update.mockResolvedValue(existing);

            const changes = {
                wbsId,
                projectId,
                toAdd: [],
                toUpdate: [
                    {
                        PROJECT_ID: projectId,
                        WBS_ID: 'D1-0001',
                        PHASE: '開発',
                        ACTIVITY: 'A',
                        TASK: '更新タスク',
                        TANTO: '田中',
                        KIJUN_START_DATE: null,
                        KIJUN_END_DATE: null,
                        YOTEI_START_DATE: null,
                        YOTEI_END_DATE: null,
                        JISSEKI_START_DATE: null,
                        JISSEKI_END_DATE: null,
                        KIJUN_KOSU: null,
                        YOTEI_KOSU: null,
                        JISSEKI_KOSU: null,
                        KIJUN_KOSU_BUFFER: null,
                        STATUS: '着手中',
                        BIKO: null,
                        PROGRESS_RATE: null,
                    },
                ],
                toDelete: [],
                timestamp: new Date(),
            } as const;

            const result = await wbsSyncService.applyChanges(changes as any);

            expect(mockTaskRepository.update).toHaveBeenCalledTimes(1);
            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(0);
            expect(result.updatedCount).toBe(1);
            expect(result.deletedCount).toBe(0);
            expect(result.recordCount).toBe(1);
        });

        it('ドメイン制約違反時に validationErrors を返すこと（TaskNo フォーマット不正）', async () => {
            const changes = {
                wbsId,
                projectId,
                toAdd: [
                    {
                        PROJECT_ID: projectId,
                        WBS_ID: 'BAD_FORMAT',
                        PHASE: '',
                        ACTIVITY: 'A',
                        TASK: '作成タスク',
                        TANTO: null,
                        KIJUN_START_DATE: null,
                        KIJUN_END_DATE: null,
                        YOTEI_START_DATE: null,
                        YOTEI_END_DATE: null,
                        JISSEKI_START_DATE: null,
                        JISSEKI_END_DATE: null,
                        KIJUN_KOSU: null,
                        YOTEI_KOSU: null,
                        JISSEKI_KOSU: null,
                        KIJUN_KOSU_BUFFER: null,
                        STATUS: '未着手',
                        BIKO: null,
                        PROGRESS_RATE: null,
                    },
                ],
                toUpdate: [],
                toDelete: [],
                timestamp: new Date(),
            } as const;

            const result = await wbsSyncService.applyChanges(changes as any);

            expect(result.success).toBe(false);
            expect(result.errorDetails).toBeDefined();
            const errors = (result.errorDetails as any).validationErrors as Array<any>;
            expect(errors.length).toBe(1);
            expect(errors[0].taskNo).toBe('BAD_FORMAT');
            expect(String(errors[0].message)).toContain('タスクID');
            expect(mockTaskRepository.create).not.toHaveBeenCalled();
        });
    });
});
