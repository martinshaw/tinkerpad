import { php } from '../../../wailsjs/go/models';

export interface SessionTarget {
    workingDir: string;
    phpBinaryPath?: string;
    sshConn?: { uuid: string };
    containerInfo?: {
        id: string;
        workingDir: string;
        phpBinaryPath: string;
        phpRunnerPath: string;
    };
}

export const sessionSpec = (tab: SessionTarget) =>
    new php.SessionSpec({
        runtime: tab.containerInfo ? 'docker' : tab.sshConn ? 'ssh' : 'local',
        workingDir: tab.containerInfo?.workingDir || tab.workingDir,
        phpBinaryPath: tab.containerInfo?.phpBinaryPath || tab.phpBinaryPath || '',
        sshUuid: tab.sshConn?.uuid || '',
        containerId: tab.containerInfo?.id || '',
        phpRunnerPath: tab.containerInfo?.phpRunnerPath || '',
    });
