import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activities } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PortfolioPositions } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-positions.interface';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { SymbolItem } from '@ghostfolio/api/app/symbol/interfaces/symbol-item.interface';
import { UserItem } from '@ghostfolio/api/app/user/interfaces/user-item.interface';
import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { UpdateUserSettingsDto } from '@ghostfolio/api/app/user/update-user-settings.dto';
import { PropertyDto } from '@ghostfolio/api/services/property/property.dto';
import {
  Access,
  Accounts,
  AdminData,
  AdminMarketData,
  Export,
  Filter,
  InfoItem,
  PortfolioChart,
  PortfolioDetails,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPublicDetails,
  PortfolioReport,
  PortfolioSummary,
  User
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { DataSource, Order as OrderModel } from '@prisma/client';
import { parseISO } from 'date-fns';
import { cloneDeep, groupBy } from 'lodash';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public constructor(private http: HttpClient) {}

  public createCheckoutSession({
    couponId,
    priceId
  }: {
    couponId?: string;
    priceId: string;
  }) {
    return this.http.post('/api/v1/subscription/stripe/checkout-session', {
      couponId,
      priceId
    });
  }

  public fetchAccounts() {
    return this.http.get<Accounts>('/api/v1/account');
  }

  public fetchAdminData() {
    return this.http.get<AdminData>('/api/v1/admin');
  }

  public fetchAdminMarketData() {
    return this.http.get<AdminMarketData>('/api/v1/admin/market-data');
  }

  public deleteAccess(aId: string) {
    return this.http.delete<any>(`/api/v1/access/${aId}`);
  }

  public deleteAccount(aId: string) {
    return this.http.delete<any>(`/api/v1/account/${aId}`);
  }

  public deleteOrder(aId: string) {
    return this.http.delete<any>(`/api/v1/order/${aId}`);
  }

  public deleteUser(aId: string) {
    return this.http.delete<any>(`/api/v1/user/${aId}`);
  }

  public fetchAccesses() {
    return this.http.get<Access[]>('/api/v1/access');
  }

  public fetchChart({ range }: { range: DateRange }) {
    return this.http.get<PortfolioChart>('/api/v1/portfolio/chart', {
      params: { range }
    });
  }

  public fetchExport(activityIds?: string[]) {
    let params = new HttpParams();

    if (activityIds) {
      params = params.append('activityIds', activityIds.join(','));
    }

    return this.http.get<Export>('/api/v1/export', {
      params
    });
  }

  public fetchInfo(): InfoItem {
    const info = cloneDeep((window as any).info);

    if (window.localStorage.getItem('utm_source') === 'trusted-web-activity') {
      info.globalPermissions = info.globalPermissions.filter(
        (permission) => permission !== permissions.enableSubscription
      );
    }

    return info;
  }

  public fetchInvestments(): Observable<PortfolioInvestments> {
    return this.http.get<any>('/api/v1/portfolio/investments').pipe(
      map((response) => {
        if (response.firstOrderDate) {
          response.firstOrderDate = parseISO(response.firstOrderDate);
        }

        return response;
      })
    );
  }

  public fetchSymbolItem({
    dataSource,
    includeHistoricalData,
    symbol
  }: {
    dataSource: DataSource | string;
    includeHistoricalData?: number;
    symbol: string;
  }) {
    let params = new HttpParams();

    if (includeHistoricalData) {
      params = params.append('includeHistoricalData', includeHistoricalData);
    }

    return this.http.get<SymbolItem>(`/api/v1/symbol/${dataSource}/${symbol}`, {
      params
    });
  }

  public fetchPositions({
    range
  }: {
    range: DateRange;
  }): Observable<PortfolioPositions> {
    return this.http.get<PortfolioPositions>('/api/v1/portfolio/positions', {
      params: { range }
    });
  }

  public fetchSymbols(aQuery: string) {
    return this.http
      .get<{ items: LookupItem[] }>(`/api/v1/symbol/lookup?query=${aQuery}`)
      .pipe(
        map((respose) => {
          return respose.items;
        })
      );
  }

  public fetchOrders(): Observable<Activities> {
    return this.http.get<any>('/api/v1/order').pipe(
      map(({ activities }) => {
        for (const activity of activities) {
          activity.createdAt = parseISO(activity.createdAt);
          activity.date = parseISO(activity.date);
        }
        return { activities };
      })
    );
  }

  public fetchPortfolioDetails({ filters }: { filters?: Filter[] }) {
    let params = new HttpParams();

    if (filters?.length > 0) {
      const {
        ACCOUNT: filtersByAccount,
        ASSET_CLASS: filtersByAssetClass,
        TAG: filtersByTag
      } = groupBy(filters, (filter) => {
        return filter.type;
      });

      if (filtersByAccount) {
        params = params.append(
          'accounts',
          filtersByAccount
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }

      if (filtersByAssetClass) {
        params = params.append(
          'assetClasses',
          filtersByAssetClass
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }

      if (filtersByTag) {
        params = params.append(
          'tags',
          filtersByTag
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }
    }

    return this.http.get<PortfolioDetails>('/api/v1/portfolio/details', {
      params
    });
  }

  public fetchPortfolioPerformance(params: { [param: string]: any }) {
    return this.http.get<PortfolioPerformanceResponse>(
      '/api/v1/portfolio/performance',
      {
        params
      }
    );
  }

  public fetchPortfolioPublic(aId: string) {
    return this.http.get<PortfolioPublicDetails>(
      `/api/v1/portfolio/public/${aId}`
    );
  }

  public fetchPortfolioReport() {
    return this.http.get<PortfolioReport>('/api/v1/portfolio/report');
  }

  public fetchPortfolioSummary(): Observable<PortfolioSummary> {
    return this.http.get<any>('/api/v1/portfolio/summary').pipe(
      map((summary) => {
        if (summary.firstOrderDate) {
          summary.firstOrderDate = parseISO(summary.firstOrderDate);
        }

        return summary;
      })
    );
  }

  public fetchPositionDetail({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    return this.http
      .get<any>(`/api/v1/portfolio/position/${dataSource}/${symbol}`)
      .pipe(
        map((data) => {
          if (data.orders) {
            for (const order of data.orders) {
              order.createdAt = parseISO(order.createdAt);
              order.date = parseISO(order.date);
            }
          }

          return data;
        })
      );
  }

  public loginAnonymous(accessToken: string) {
    return this.http.get<any>(`/api/v1/auth/anonymous/${accessToken}`);
  }

  public postAccess(aAccess: CreateAccessDto) {
    return this.http.post<OrderModel>(`/api/v1/access`, aAccess);
  }

  public postAccount(aAccount: CreateAccountDto) {
    return this.http.post<OrderModel>(`/api/v1/account`, aAccount);
  }

  public postOrder(aOrder: CreateOrderDto) {
    return this.http.post<OrderModel>(`/api/v1/order`, aOrder);
  }

  public postUser() {
    return this.http.post<UserItem>(`/api/v1/user`, {});
  }

  public putAccount(aAccount: UpdateAccountDto) {
    return this.http.put<UserItem>(`/api/v1/account/${aAccount.id}`, aAccount);
  }

  public putAdminSetting(key: string, aData: PropertyDto) {
    return this.http.put<void>(`/api/v1/admin/settings/${key}`, aData);
  }

  public putOrder(aOrder: UpdateOrderDto) {
    return this.http.put<UserItem>(`/api/v1/order/${aOrder.id}`, aOrder);
  }

  public putUserSetting(aData: UpdateUserSettingDto) {
    return this.http.put<User>(`/api/v1/user/setting`, aData);
  }

  public putUserSettings(aData: UpdateUserSettingsDto) {
    return this.http.put<User>(`/api/v1/user/settings`, aData);
  }

  public redeemCoupon(couponCode: string) {
    return this.http.post('/api/v1/subscription/redeem-coupon', {
      couponCode
    });
  }
}
