import { Assignee } from "./assignee";
import { Phase } from "../phase/phase";
import { TaskStatus } from "./project-status";
import { Period } from "./period";


export class Task {
    public readonly id?: string;
    public wbsId: number;
    public name: string;
    public status: TaskStatus;
    public phaseId?: number;
    public phase?: Phase;
    public assigneeId?: string;
    public assignee?: Assignee;
    public periods?: Period[];

    private constructor(args: {
        id?: string;
        wbsId: number;
        name: string;
        assigneeId?: string;
        status: TaskStatus;
        phaseId?: number;
        phase?: Phase;
        assignee?: Assignee;
        periods?: Period[];
    }) {
        this.id = args.id;
        this.wbsId = args.wbsId;
        this.name = args.name;
        this.assigneeId = args.assigneeId;
        this.status = args.status;
    }

    public isEqual(task: Task) {
        return this.id === task.id;
    }

    public static create(args: { wbsId: number; name: string; assigneeId?: string; status: TaskStatus }): Task {
        return new Task(args);
    }

    public static createFromDb(args:
        {
            id: string;
            wbsId: number;
            name: string;
            status: TaskStatus;
            assigneeId?: string;
            assignee?: Assignee;
            phaseId?: number;
            phase?: Phase;
            periods?: Period[];
        }): Task {
        return new Task(args);
    }

    public getStatus() {
        return this.status.status;
    }

    public updateName(name: string) {
        this.name = name;
    }

    public updateAssigneeId(assigneeId: string) {
        this.assigneeId = assigneeId;
    }

    public updateStatus(status: TaskStatus) {
        this.status = status;
    }
}
