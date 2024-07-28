import sessionStorage, { AuthDataSingle } from "../sessionStorage";
import { AppManager } from "./manager";
import tsNow from "../../helpers/tsNow";
import MTProtoMessagePort from "../mtproto/mtprotoMessagePort";
import MTPNetworker from "../mtproto/networker";
import { IDB } from "../files/idb";
import { UserAuth } from "../mtproto/mtproto_config";
import AppStorage from "../storage";
import CacheStorageController from "../files/cacheStorage";
import Modes from "../../config/modes";


export const ACCOUNT_PREFIX = "account"
const keys: (keyof AuthDataSingle)[] = [
    'dc',
    'user_auth',
    'state_id',
    'dc1_auth_key',
    'dc2_auth_key',
    'dc3_auth_key',
    'dc4_auth_key',
    'dc5_auth_key',
    'dc1_server_salt',
    'dc2_server_salt',
    'dc3_server_salt',
    'dc4_server_salt',
    'dc5_server_salt',
    'auth_key_fingerprint',
    'server_time_offset',
    'xt_instance',//TODO useless
    'kz_version',
    'tgme_sync',
    'k_build',
];


export class MultipleAccountManager extends AppManager {

    networkers: {
        [key: string | number]: MTPNetworker;
    } = {}

    protected after() {
        this.rootScope.addEventListener('user_auth', (userAuth) => {
            this.cacheAccount(userAuth);
        });
    }

    public async start() {
        if (!Modes.multiAccountNotifications) {
            return;
        }

        const [accounts, currentAuth] = await Promise.all([this.getAccounts(), sessionStorage.get('user_auth')]);

        if (accounts) {
            let index = 1;
            for (let account of accounts) {

                if (account.user_auth.id != currentAuth.id) {
                    const fromAccount = account.user_auth.id;
                 

                    const networker = await this.apiManager.getNetworkerForAuth(account);
                    this.networkers[account.user_auth.id] = networker;
                    this.apiManager.invokeApiWithNetworker('updates.getState', {
                        dcId: account.dc
                    }, { noErrorBox: true }, networker).then((stateResult) => {
                    
                        if (!stateResult) {
                            return;
                        }
                        //this.updatesState.seq = stateResult.seq;
                        let pts = stateResult.pts;
                        let date = stateResult.date;
                        let seq = stateResult.seq;
                        let qts = stateResult.qts;
                        let first = true;
                        setInterval(() => {
                            try {

                              
                                const res = this.apiManager.invokeApiWithNetworker('updates.getDifference', {
                                    pts,
                                    pts_total_limit: first ? 1200 : undefined,
                                    date,
                                    qts
                                }, {
                                    timeout: 0x7fffffff
                                }, networker).then(async (differenceResult) => {
                                   
                                    if (!differenceResult) {
                                        return;
                                    }

                                    if (differenceResult._ === 'updates.differenceEmpty') {

                                        date = differenceResult.date;
                                        seq = differenceResult.seq;
                                        return;
                                    }


                                    if (differenceResult._ !== 'updates.differenceTooLong') {

                                        differenceResult.other_updates.forEach((update) => {
                                            // switch (update._) {
                                            //     case 'updateChannelTooLong':
                                            //     case 'updateNewChannelMessage':
                                            //     case 'updateEditChannelMessage':

                                            //        // this.apiUpdatesManager.saveUpdate(update);
                                            //         return;
                                            // }
                                           
                                            ///  this.apiUpdatesManager.processUpdate(update);
                                        });

                                        //   log('applying', differenceResult.new_messages.length, 'new messages');
                                        differenceResult.new_messages.forEach((apiMessage) => {

                                            if ((apiMessage._ !== 'messageEmpty')) {
                                                // uiNotificationsManager.buildNotificationQueue({
                                                //     message: apiMessage
                                                // });

                                                if (!apiMessage.peerId) {
                                                    apiMessage.peerId = this.appPeersManager.getPeerId(apiMessage.peer_id);
                                                }

                                                const port = MTProtoMessagePort.getInstance<false>();
                                                port.invokeVoid('notificationBuild', {
                                                    message: apiMessage,
                                                    fromAccount,

                                                },);


                                            }
                                            // this.apiUpdatesManager.processUpdate({
                                            //     _: 'updateNewMessage',
                                            //     message: apiMessage,
                                            //     pts: pts,
                                            //     pts_count: 0
                                            // });

                                        });

                                        const nextState = differenceResult._ === 'updates.difference' ? differenceResult.state : differenceResult.intermediate_state;
                                        seq = nextState.seq;
                                        pts = nextState.pts;
                                        date = nextState.date;
                                    } else {
                                        pts = differenceResult.pts;
                                        date = tsNow(true) + this.timeManager.getServerTimeOffset();
                                        seq = 0
                                    }
                                });

                                first = false;
                            } catch (e) {
                                console.log('#UPD ERROR', e);
                            }
                        }, 2000);
                    });
                }

                ++index;
            }
        }    
    }

    public async onLogOut() {
        const [all, currentAuth] = await Promise.all([this.getAccounts(), sessionStorage.get('user_auth')]);

        if (!currentAuth) {
            return;
        }

        let index = all.findIndex(x => x.user_auth.id == currentAuth.id)
        if (index !== -1) {

            all.splice(index, 1);
            IDB.closeDatabases();
            IDB.clear('tweb-' + currentAuth.id); //TODO "delete" may not working... so clear for sure.
            IDB.delete('tweb-' + currentAuth.id);
            //@ts-ignore;
            await Promise.all([
                sessionStorage.delete(`${ACCOUNT_PREFIX}_1`),
                sessionStorage.delete(`${ACCOUNT_PREFIX}_2`),
                sessionStorage.delete(`${ACCOUNT_PREFIX}_3`),
                sessionStorage.delete(`${ACCOUNT_PREFIX}_4`),
            ])


            if (all.length > 0) {
                const toSet = {
                    retreatTo: all[0].user_auth.id
                }
                for (let i = 0; i < all.length; ++i) {
                    //@ts-ignore;
                    toSet[`${ACCOUNT_PREFIX}_${i + 1}`] = all[i]
                }
                await sessionStorage.set(toSet);
            }
        }
        //TODO stop all updates, remove networkers.
    }


    public async getAccounts() {
        return (await Promise.all([
            sessionStorage.get(`${ACCOUNT_PREFIX}_${1}`),
            sessionStorage.get(`${ACCOUNT_PREFIX}_${2}`),
            sessionStorage.get(`${ACCOUNT_PREFIX}_${3}`),
            sessionStorage.get(`${ACCOUNT_PREFIX}_${4}`),
        ])).filter(Boolean);
    }

    public getCurrentAccount() {

    }


    //1-yes, 0-yes but premium required, -1 - no max.
    public async canAddAccount(): Promise<0 | 1 | -1> {        
        const accounts = await this.getAccounts();
        if (accounts.length >= 4) {
            return -1;
        }

        if (accounts.length == 3) {
            return this.rootScope.premium ? 1 : 0;
        }

        return 1;
    }

    //TODO stop all updates, remove networkers.
    public async addAccount() {
        const [all, currentAuth] = await Promise.all([this.getAccounts(), sessionStorage.get('user_auth')]);

        AppStorage.toggleStorage(false, true),
            CacheStorageController.toggleStorage(false, true),
            //  await toggleStorages(false, true);
            IDB.closeDatabases();


        await IDB.clone('tweb', 'tweb-' + currentAuth.id);
        await IDB.clear('tweb', ['users']);


        const account = {} as any;
        await Promise.all(keys.map(async (key) => {
            account[key] = await sessionStorage.get(key);
            sessionStorage.delete(key);
        }));

        sessionStorage.delete('xt_instance');
        sessionStorage.delete('state_id');
        sessionStorage.delete('user_auth');
        let id = all.findIndex(x => x.user_auth.id == currentAuth.id)
        if (id === -1) {
            id = all.length;
        }
        id += 1;
        const key = `${ACCOUNT_PREFIX}_${id}`;
        await sessionStorage.set({
            [key]: account,
            retreatTo: currentAuth.id
        })

        this.reload();
    }

    public async removeAccount() {

    }

    public async hasRetreatTo() {
        return sessionStorage.get('retreatTo');
    }

    public async clearRetreatTo() {
        if (await sessionStorage.get('user_auth')) {
            await sessionStorage.delete('retreatTo');
        }
    }
    public async retreatTo(toId: number) {
        sessionStorage.delete('retreatTo');
        await IDB.clone('tweb-' + toId,'tweb');
        const all = await this.getAccounts();
        const index = all.findIndex(x => x.user_auth.id == toId);
        if (index === -1) {
            return false;
        }
        const account = all[index]
        sessionStorage.set(account);
        await IDB.clone('tweb-' + account.user_auth.id, 'tweb');
        return true;
    }

    //TODO stop all updates, remove networkers.
    public async switchAccount(toId: number): Promise<boolean> {
        const [all, currentAuth] = await Promise.all([this.getAccounts(), sessionStorage.get('user_auth')]);

        if (currentAuth?.id == toId) {
            return false;
        }

        const index = all.findIndex(x => x.user_auth.id == toId);
        if (index === -1) {
            return false;
        }


        if (currentAuth) {
            await IDB.clone('tweb', 'tweb-' + currentAuth.id);
            const dbExists = await IDB.clone('tweb-' + toId, 'tweb');
            if (!dbExists) {
                //await IDB.delete('tweb');
                await IDB.clear('tweb');
            }


            const currentAuthIndex = all.findIndex(x => x.user_auth.id == currentAuth.id);
            const account = all[currentAuthIndex];
            await Promise.all(keys.map(async (key) => {
                //@ts-ignore
                account[key] = await sessionStorage.get(key);
                //  sessionStorage.delete(key);
            }));


            const i = currentAuthIndex === -1 ? all.length + 1 : currentAuthIndex + 1;

            await sessionStorage.set({
                [`${ACCOUNT_PREFIX}_${i}`]: account,
            })
        }


        await Promise.all([
            sessionStorage.set(all[index]),
            AppStorage.toggleStorage(false, true),
            CacheStorageController.toggleStorage(false, true),
            IDB.closeDatabases()
        ])


        return true;
    }

    private async cacheAccount(userAuth: UserAuth) {
        const all = await this.getAccounts();

        if (all.some(account => account.user_auth.id == userAuth.id)) {
            return;
        }

        await sessionStorage.set({
            [`${ACCOUNT_PREFIX}_${all.length + 1}`]: {
                'user_auth': userAuth
            },
        })
    }

    private reload() {
        // webPushApiManager.forceUnsubscribe(),
        //     appRuntimeManager.reload();
    }
}

