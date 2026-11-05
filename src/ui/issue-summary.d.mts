export interface Issue {owner:string;cause:string;message:string;severity?:'error'|'warning'|'info';blocking?:boolean;target?:string}
export function createIssueSummary():{report(issue:Issue):string;clear(owner:string,cause:string):boolean;clearOwner(owner:string):void;status(text:string):void;snapshot():{count:number;severity:string;label:string;status:string;issues:Issue[]}};
