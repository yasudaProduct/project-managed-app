import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { LabeledAllocationSet } from '@/domains/assignee-workload/workload-merge-service';
import { RateBasis } from '@/applications/assignee-gantt/workload-data';
import { TargetWbsInfo } from './itarget-wbs-query-repository';

/** 外部(他プロジェクト)負荷の取得条件 */
export interface ExternalWorkloadQuery {
  startDate: Date;
  endDate: Date;
  /** 指定時はそのユーザーに限定する。空配列は対象なし(空結果) */
  userIds?: string[];
  /** このプロジェクトの全WBSを対象集合から除外する(2重計上防止) */
  excludeProjectId?: string;
}

/** 現WBS担当者行の合算負荷と、Rバッジ(取り分超過)判定用の参画率基準 */
export interface MergedAssigneeWorkload {
  workload: AssigneeWorkload;
  /** Rバッジ用: 現WBS分の配分 > standardWorkingHours × rate で取り分超過を判定する */
  rateBasis: RateBasis;
}

/**
 * 横断ワークロードサービス
 * 未開始・進行中プロジェクトの最新WBSを対象に、WBS横断の担当者負荷を算出する。
 */
export interface ICrossWbsWorkloadService {
  /** 対象WBS(未開始・進行中プロジェクトの最新WBS)を解決する */
  resolveTargetWbs(excludeProjectId?: string): Promise<TargetWbsInfo[]>;
  /**
   * プロジェクト横断ページ用: 全対象WBSを横断したユーザー単位のマージ済み負荷。
   * 分母は標準勤務時間−個人予定(参画率キャップなし)、assigneeRate=1。
   */
  getCrossProjectUserWorkloads(startDate: Date, endDate: Date): Promise<AssigneeWorkload[]>;
  /**
   * WBS内トグル用: 現WBSの担当者行に他プロジェクト対象WBSの負荷を合算する。
   * 行は現WBSの担当者のみ。現プロジェクトの全WBSは対象集合から除外する。
   * 各行にはRバッジ(取り分超過)判定用の現WBS参画率基準(rateBasis)を添える。
   */
  getWbsWorkloadsWithExternal(wbsId: number, startDate: Date, endDate: Date): Promise<MergedAssigneeWorkload[]>;
  /**
   * スケジューラ/プレビュー用: ユーザーIDごとのプロジェクト名ラベル付き外部配分セット
   * (対象WBS×担当者ごとに1セット)。
   */
  getExternalAllocationSets(query: ExternalWorkloadQuery): Promise<Map<string, LabeledAllocationSet[]>>;
}
