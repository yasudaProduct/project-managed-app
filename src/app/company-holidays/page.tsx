"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { CompanyHolidayForm } from "@/components/company-holidays/company-holiday-form";

type CompanyHolidayType = "NATIONAL" | "COMPANY" | "SPECIAL";

interface CompanyHoliday {
  id: number;
  date: string;
  name: string;
  type: CompanyHolidayType;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyHolidaysPage() {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [loading, setLoading] = useState(true);

  // 休日タイプの表示名とバッジ色
  const getHolidayTypeLabel = (type: CompanyHolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "国民の祝日";
      case "COMPANY":
        return "会社休日";
      case "SPECIAL":
        return "特別休日";
      default:
        return type;
    }
  };

  const getHolidayTypeBadgeVariant = (type: CompanyHolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "destructive";
      case "COMPANY":
        return "default";
      case "SPECIAL":
        return "secondary";
      default:
        return "outline";
    }
  };

  // 休日データの取得
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/company-holidays");// TODO:server actionに変更
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      } else {
        console.error("休日データの取得に失敗しました");
      }
    } catch (error) {
      console.error("休日データの取得中にエラーが発生しました:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // 休日の削除
  const handleDelete = async (id: number) => {
    if (!confirm("この休日を削除しますか？")) return;

    try {
      const response = await fetch(`/api/company-holidays/${id}`, {// TODO:server actionに変更
        method: "DELETE",
      });

      if (response.ok) {
        setHolidays(holidays.filter((holiday) => holiday.id !== id));
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("削除中にエラーが発生しました:", error);
      alert("削除中にエラーが発生しました");
    }
  };

  // 新規登録・編集フォームを開く
  const handleOpenForm = (holiday?: CompanyHoliday) => {
    setEditingHoliday(holiday || null);
    setIsFormOpen(true);
  };

  // フォームを閉じる
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHoliday(null);
  };

  // 休日の保存後の処理
  const handleSaveSuccess = () => {
    handleCloseForm();
    fetchHolidays(); // データを再取得
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>会社休日管理</CardTitle>
              <CardDescription>
                会社の休日を管理します。営業日案分計算に使用されます。
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新規追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>休日名</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      登録されている休日がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        {formatDate(holiday.date)}
                      </TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell>
                        <Badge variant={getHolidayTypeBadgeVariant(holiday.type)}>
                          {getHolidayTypeLabel(holiday.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(holiday.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenForm(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(holiday.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新規登録・編集フォーム */}
      {isFormOpen && (
        <CompanyHolidayForm
          holiday={editingHoliday}
          onClose={handleCloseForm}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}